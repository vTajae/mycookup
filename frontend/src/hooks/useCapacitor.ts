import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Keyboard } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";

export function useCapacitor() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if running in native app
    const checkNative = async () => {
      try {
        const info = await App.getInfo();
        setIsNative(!!info.name);
      } catch {
        setIsNative(false);
      }
    };

    checkNative();

    // Set up native features if available
    if (isNative) {
      // Configure status bar
      StatusBar.setStyle({ style: Style.Default });
      
      // Hide keyboard on app background
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          Keyboard.hide();
        }
      });
    }
  }, [isNative]);

  const triggerHaptic = async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  };

  const hideKeyboard = async () => {
    if (isNative) {
      try {
        await Keyboard.hide();
      } catch (error) {
        console.log('Keyboard control not available:', error);
      }
    }
  };

  return {
    isNative,
    triggerHaptic,
    hideKeyboard,
  };
}
