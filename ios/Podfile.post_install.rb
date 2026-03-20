post_install do |installer|
  # Minimum iOS deployment target - set to 12.0 for Google-related pods compatibility
  # All pods will use 13.0 to ensure latest stability
  MINIMUM_DEPLOYMENT_TARGET = '12.0'
  TARGET_DEPLOYMENT_TARGET = '13.0'
  
  installer.pods_project.targets.each do |target|
    # List of pods that may have lower deployment targets
    google_related_pods = [
      'GoogleSignIn-GoogleSignIn',
      'GoogleSignIn',
      'GTMSessionFetcher-GTMSessionFetcher_Core_Privacy',
      'GTMSessionFetcher',
      'GTMAppAuth',
      'AppAuth-AppAuthCore_Privacy',
      'AppAuth',
      'Google-Mobile-Ads-SDK',
      'GoogleUserMessagingPlatform'
    ]
    
    target.build_configurations.each do |config|
      current_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      
      # If the current target is less than minimum (12.0), set it to TARGET_DEPLOYMENT_TARGET
      if current_target.nil? || current_target.to_f < MINIMUM_DEPLOYMENT_TARGET.to_f
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = TARGET_DEPLOYMENT_TARGET
      elsif current_target.to_f < TARGET_DEPLOYMENT_TARGET.to_f
        # If it's between 12.0 and 13.0, upgrade to 13.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = TARGET_DEPLOYMENT_TARGET
      end
    end
    
    # Fix script phase build warnings by setting proper output declarations
    # This prevents Xcode from repeatedly running dependency analysis
    if target.respond_to?(:build_phases)
      target.build_phases.each do |build_phase|
        next unless build_phase.respond_to?(:name)
        
        phase_name = build_phase.name
        next if phase_name.nil?
        
        # Script phases that need output file declarations
        case phase_name
        when /\[CP-User\] \[Hermes\] Replace Hermes/
          if build_phase.respond_to?(:output_paths)
            build_phase.output_paths = ["${BUILT_PRODUCTS_DIR}/#{target.name}.framework"]
          end
        when /\[CP-User\] \[RNGoogleMobileAds\] Configuration/
          if build_phase.respond_to?(:output_paths)
            build_phase.output_paths = ["${BUILT_PRODUCTS_DIR}/RNGoogleMobileAds.configured"]
          end
        when /\[CP-User\] Generate app.manifest for expo-updates/
          if build_phase.respond_to?(:output_paths)
            build_phase.output_paths = ["${BUILT_PRODUCTS_DIR}/app.manifest"]
          end
        when /\[CP-User\] Generate app.config for prebuilt Constants.manifest/
          if build_phase.respond_to?(:output_paths)
            build_phase.output_paths = ["${BUILT_PRODUCTS_DIR}/app.config"]
          end
        when /Create Symlinks to Header Folders/
          if build_phase.respond_to?(:output_paths)
            build_phase.output_paths = ["${BUILT_PRODUCTS_DIR}/#{target.name}.framework/Headers"]
          end
        end
      end
    end
  end
end
