use regex::Regex;
use std::sync::{Arc, Mutex};

use rspack_core::{ApplyContext, Compilation, CompilationProcessAssets, Plugin};
use rspack_error::Result;
use rspack_hook::{plugin, plugin_hook};

use crate::RspackCodeCheckerPluginOptions;

/// A plugin that checks code for illegal patterns.
#[derive(Debug)]
#[plugin]
pub struct RspackCodeCheckerPlugin {
  exclude_regexes: Vec<Regex>,
  risky_string_check: Vec<Regex>,
  allowed_domain_resources: Vec<Regex>,
  domain_regex: Regex,
  errors: Arc<Mutex<Vec<String>>>,
}

impl RspackCodeCheckerPlugin {
  pub fn new(options: RspackCodeCheckerPluginOptions) -> Self {
    // Compile exclude module regexes
    let exclude_regexes = options
      .exclude_modules
      .as_ref()
      .map(|modules| {
        modules
          .iter()
          .filter_map(|pattern| Regex::new(pattern).ok())
          .collect()
      })
      .unwrap_or_default();

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
      exclude_regexes,
      risky_string_check,
      allowed_domain_resources,
      domain_regex,
      Arc::new(Mutex::new(Vec::new())),
    )
  }
}

#[plugin_hook(CompilationProcessAssets for RspackCodeCheckerPlugin, stage = Compilation::PROCESS_ASSETS_STAGE_ADDITIONS, tracing = false)]
async fn process_assets(&self, compilation: &mut Compilation) -> Result<()> {
  // Check all assets for illegal code patterns
  for (name, asset) in compilation.assets_mut().iter_mut() {
    // Skip if module should be excluded
    if self.should_exclude_module(name) {
      continue;
    }

    // Get the source code
    if let Some(source) = asset.get_source() {
      let code = source.source().to_string();

      // Check for illegal patterns and collect errors
      self.check_code(&code, name);
    }
  }

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

impl RspackCodeCheckerPlugin {
  /// Check if a module should be excluded from checking
  fn should_exclude_module(&self, module_name: &str) -> bool {
    self
      .exclude_regexes
      .iter()
      .any(|regex| regex.is_match(module_name))
  }

  /// Check code for illegal patterns using regex and collect errors
  fn check_code(&self, code: &str, module_name: &str) {
    print!("Checking code: {}\n", code);
    // If the string is a domain, check if it's in allowed_domain_resources
    // If not allowed, report error and skip further checks
    let mut un_allowed = false;
    if self.domain_regex.is_match(code) {
      un_allowed = !self
        .allowed_domain_resources
        .iter()
        .any(|regex| regex.is_match(code));
    }

    if un_allowed {
      self.add_error(format!("{} has unallowed domain resources", module_name,));
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

impl Plugin for RspackCodeCheckerPlugin {
  fn name(&self) -> &'static str {
    "RspackCodeCheckerPlugin"
  }

  fn apply(&self, ctx: &mut ApplyContext) -> rspack_error::Result<()> {
    ctx
      .compilation_hooks
      .process_assets
      .tap(process_assets::new(self));
    Ok(())
  }
}
