post_install do |installer|
  # Fix iOS deployment target for all pods
  # Ensure minimum iOS 12.0 according to Xcode requirements
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Enforce iOS 13.0 for all pods (app target requires 13.4)
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end
  
  # Additional fix: handle Hermes and React Native build settings
  hermes_engine = installer.pods_project.targets.find { |t| t.name == 'hermes-engine' }
  if hermes_engine
    hermes_engine.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      # Disable warnings as errors for compatibility
      config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    end
  end
end
