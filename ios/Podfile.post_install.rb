post_install do |installer|
  # Force all pods to minimum iOS 13.0 deployment target
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
    end
  end

  # Fix the specific problematic pods
  installer.pods_project.targets.each do |target|
    if ['GoogleSignIn-GoogleSignIn', 'GTMSessionFetcher-GTMSessionFetcher_Core_Privacy', 'AppAuth-AppAuthCore_Privacy'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
    end
  end
end
