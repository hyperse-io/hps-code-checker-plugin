mod plugin;

use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};

use rspack_binding_builder_macros::register_plugin;
use rspack_core::BoxPlugin;

#[macro_use]
extern crate napi_derive;
extern crate rspack_binding_builder;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RspackCodeCheckerPluginOptions {
  #[serde(rename = "riskyStringCheck")]
  pub risky_string_check: Vec<String>,
  #[serde(rename = "allowedDomainResources")]
  pub allowed_domain_resources: Vec<String>,
  #[serde(rename = "domainRegex")]
  pub domain_regex: Option<String>,
}

register_plugin!(
  "RspackCodeCheckerPlugin",
  |_env: Env, options: Unknown<'_>| {
    // Try to parse as JSON string first, fallback to environment variables
    let parsed_options = if let Ok(options_str) = options.coerce_to_string() {
      // JsString does not implement Debug, so print as UTF-8 string
      let utf8_str = options_str.into_utf8()?;
      let json_str = utf8_str.as_str()?;
      serde_json::from_str(json_str).map_err(|e| {
        napi::Error::new(
          napi::Status::InvalidArg,
          format!("Failed to parse JSON options: {}", e),
        )
      })?
    } else {
      RspackCodeCheckerPluginOptions {
        risky_string_check: vec![],
        allowed_domain_resources: vec![],
        domain_regex: None,
      }
    };
    Ok(Box::new(plugin::RspackCodeCheckerPlugin::new(parsed_options)) as BoxPlugin)
  }
);
