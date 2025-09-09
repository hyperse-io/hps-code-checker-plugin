use regex::Regex;
use std::sync::{Arc, Mutex};

use rspack_core::{Compilation, CompilationAfterProcessAssets, CompilationProcessAssets, Plugin};
use rspack_error::Result;
use rspack_hook::{plugin, plugin_hook};

use crate::RspackCodeCheckerPluginOptions;

// A plugin that checks code for illegal patterns.
#[derive(Debug)]
#[plugin]
pub struct RspackCodeCheckerPlugin {
  risky_string_check: Vec<Regex>,
  allowed_domain_resources: Vec<Regex>,
  domain_regex: Regex,
  errors: Arc<Mutex<Vec<String>>>,
}

impl RspackCodeCheckerPlugin {
  pub fn new(options: RspackCodeCheckerPluginOptions) -> Self {
    // Compile check rule regexes from strings
    let risky_string_check = options
      .risky_string_check
      .iter()
      .filter_map(|pattern| Regex::new(pattern).ok())
      .collect();

    let allowed_domain_resources = options
      .allowed_domain_resources
      .iter()
      .filter_map(|pattern| Regex::new(pattern).ok())
      .collect();

    // Pre-compile domain regex for better performance
    let domain_regex = options
      .domain_regex
      .as_ref()
      .and_then(|pattern| Regex::new(pattern).ok())
      .unwrap_or_else(|| {
        Regex::new(r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$")
          .expect("Default domain regex should be valid")
      });

    Self::new_inner(
      risky_string_check,
      allowed_domain_resources,
      domain_regex,
      Arc::new(Mutex::new(Vec::new())),
    )
  }
}

impl RspackCodeCheckerPlugin {
  /// 检查代码片段中的域名是否在白名单里
  fn find_unallowed_domains(&self, code: &str) -> Vec<String> {
    let mut unallowed = Vec::new();

    for cap in self.domain_regex.captures_iter(code) {
      let domain = &cap[0];
      let allowed = self
        .allowed_domain_resources
        .iter()
        .any(|regex| regex.is_match(domain));

      if !allowed {
        unallowed.push(domain.to_string());
      }
    }

    // 去重：使用 HashSet 来确保没有重复的域名
    use std::collections::HashSet;
    let unique_domains: HashSet<String> = unallowed.into_iter().collect();
    unique_domains.into_iter().collect()
  }

  /// Check code for illegal patterns using regex and collect errors
  fn check_code(&self, code: &str, module_name: &str) {
    // If the string is a domain, check if it's in allowed_domain_resources
    // If not allowed, report error and skip further checks
    let unallowed_domains = self.find_unallowed_domains(code);

    for domain in unallowed_domains {
      self.add_error(format!(
        "{} has unallowed domain resource: {}",
        module_name, domain
      ));
    }

    // Check using compiled regex patterns for risky strings
    for regex in &self.risky_string_check {
      if regex.is_match(code) {
        self.add_error(format!(
          "{} has risky string: {}",
          module_name,
          regex.as_str()
        ));
      }
    }
  }

  /// Helper method to safely add errors to the collection
  fn add_error(&self, error_message: String) {
    if let Ok(mut errors) = self.errors.lock() {
      errors.push(error_message);
    }
  }
}

#[plugin_hook(CompilationProcessAssets for RspackCodeCheckerPlugin, stage = Compilation::PROCESS_ASSETS_STAGE_ANALYSE, tracing = false)]
async fn process_assets(&self, compilation: &mut Compilation) -> Result<()> {
  // Check all assets for illegal code patterns
  for (name, asset) in compilation.assets_mut().iter_mut() {
    // Get the source code
    if let Some(source) = asset.get_source() {
      let code = source.source().to_string();

      // Check for illegal patterns and collect errors
      if !code.is_empty() {
        self.check_code(&code, name);
      }
    }
  }
  Ok(())
}

#[plugin_hook(CompilationAfterProcessAssets for RspackCodeCheckerPlugin, tracing = false)]
async fn after_process_assets(&self, _compilation: &mut Compilation) -> Result<()> {
  // Check if there are any errors and throw them all at once
  let errors = self
    .errors
    .lock()
    .map_err(|_| rspack_error::Error::msg("Failed to acquire errors lock"))?;

  if !errors.is_empty() {
    let error_message = errors.join("\n");
    return Err(rspack_error::Error::msg(error_message));
  }

  Ok(())
}

impl Plugin for RspackCodeCheckerPlugin {
  fn name(&self) -> &'static str {
    "RspackCodeCheckerPlugin"
  }

  fn apply(&self, ctx: &mut rspack_core::ApplyContext<'_>) -> Result<()> {
    ctx
      .compilation_hooks
      .process_assets
      .tap(process_assets::new(self));

    ctx
      .compilation_hooks
      .after_process_assets
      .tap(after_process_assets::new(self));
    Ok(())
  }
}
