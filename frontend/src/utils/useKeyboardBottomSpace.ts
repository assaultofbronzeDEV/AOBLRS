import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardBottomSpace(defaultSpace = 320) {
  const [keyboardSpace, setKeyboardSpace] = useState(0);

  useEffect(() => {
    const onShow = (e: any) => {
      const height = e?.endCoordinates?.height;
      setKeyboardSpace(height && height > 0 ? height + 60 : defaultSpace);
    };

    const onHide = () => {
      setKeyboardSpace(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    let onFocusIn: ((e: any) => void) | undefined;
    let onFocusOut: ((e: any) => void) | undefined;
    let blurTimer: ReturnType<typeof setTimeout> | undefined;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      onFocusIn = (e: any) => {
        const tag = e?.target?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || e?.target?.isContentEditable) {
          if (blurTimer) clearTimeout(blurTimer);
          setKeyboardSpace(defaultSpace);
        }
      };
      onFocusOut = () => {
        blurTimer = setTimeout(() => {
          const activeTag = document.activeElement?.tagName?.toLowerCase();
          if (activeTag !== "input" && activeTag !== "textarea" && !(document.activeElement as HTMLElement)?.isContentEditable) {
            setKeyboardSpace(0);
          }
        }, 120);
      };
      window.addEventListener("focusin", onFocusIn);
      window.addEventListener("focusout", onFocusOut);
    }

    return () => {
      showSub.remove();
      hideSub.remove();
      if (Platform.OS === "web" && typeof window !== "undefined") {
        if (blurTimer) clearTimeout(blurTimer);
        if (onFocusIn) window.removeEventListener("focusin", onFocusIn);
        if (onFocusOut) window.removeEventListener("focusout", onFocusOut);
      }
    };
  }, [defaultSpace]);

  return keyboardSpace;
}
