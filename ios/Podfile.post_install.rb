post_install do |installer|  
  # Force all pods to iOS 13.0 minimum deployment target
  installer.pods_project.targets.each do |target|
    # For GoogleSignIn and AppAuth specifically
    if target.name.include?('GoogleSignIn') || target.name.include?('AppAuth') || target.name.include?('GTM')
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        config.build_settings.delete('IPHONEOS_DEPLOYMENT_TARGET') if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_s.to_f < 13.0
      end
    end
    
    # Apply to all targets
    target.build_configurations.each do |config|
      deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if deployment_target.nil? || deployment_target.to_f < 13.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
    end
  end
  
  # Also fix MACOSX_DEPLOYMENT_TARGET if present
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
  end
end
