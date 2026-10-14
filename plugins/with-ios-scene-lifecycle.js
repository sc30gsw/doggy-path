// iOS 27 aborts at launch (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`)
// unless the app adopts the scene-based life cycle. The SDK 57 template still starts React
// Native from the app delegate, so this plugin hands the window to Expo's
// `ExpoAppSceneDelegate` instead. Drop it once the Expo template adopts scenes itself.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

const APP_DELEGATE_DECLARATION = 'class AppDelegate: ExpoAppDelegate {';
const PROVIDER_DECLARATION = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';

// The scene delegate creates the window and starts React Native into it.
const WINDOW_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return config;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('with-ios-scene-lifecycle expects a Swift AppDelegate.');
    }
    let contents = config.modResults.contents;
    if (!contents.includes(PROVIDER_DECLARATION)) {
      if (!contents.includes(APP_DELEGATE_DECLARATION) || !WINDOW_START.test(contents)) {
        throw new Error(
          'with-ios-scene-lifecycle could not find the template AppDelegate. Update the plugin for the new template.',
        );
      }
      contents = contents
        .replace(APP_DELEGATE_DECLARATION, PROVIDER_DECLARATION)
        .replace(WINDOW_START, '');
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
