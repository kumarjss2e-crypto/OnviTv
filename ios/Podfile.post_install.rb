post_install do |installer|  
  # Workaround: Remove platform from deployment target settings
  # This allows Xcode's range enforcement (12.0-26.2.99) to apply
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Explicitly set to 13.0 for all pods
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      
      # Remove any iOS-specific overrides that might conflict
      if config.build_settings['OTHER_CFLAGS']
        flags = config.build_settings['OTHER_CFLAGS']
        flags = flags.delete_if { |flag| flag.include?('min-version') } if flags.is_a?(Array)
      end
    end
  end
  
  # Fix the project-level deployment target
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
  end
end
