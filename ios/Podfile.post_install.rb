post_install do |installer|
  require 'xcodeproj'
  
  # Set all targets to iOS 13.0 deployment target
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Force deployment target to 13.0
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      config.build_settings['SWIFT_VERSION'] = '5.0'
    end
  end
  
  # Also set at project level
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
  end
  
  # Save the modified project
  installer.pods_project.save
end
