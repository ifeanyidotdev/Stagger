fn main() {
    let windows_attrs = tauri_build::WindowsAttributes::new()
        .static_vc_runtime(true);

    let attributes = tauri_build::Attributes::new()
        .windows_attributes(windows_attrs);

    tauri_build::try_build(attributes)
        .expect("failed to run tauri-build");
}
