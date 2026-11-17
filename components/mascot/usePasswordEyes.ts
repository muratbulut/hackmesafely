"use client";

import { useEffect } from "react";

const isPassword = (el: HTMLInputElement) => el.type === "password" || /password/.test(el.autocomplete);

/**
 * Şifre alanına girilince sayfadaki gözler kapanır (html data-mascot-eyes="shut", kural mascot.css'te),
 * çıkınca açılır. Şifre görünür yapılınca da (metin alanı) kapalı kalır. Yazılan metne hiç bakılmaz.
 */
export function usePasswordEyes() {
  useEffect(() => {
    const root = document.documentElement;
    function onFocus(e: FocusEvent) {
      if (e.target instanceof HTMLInputElement && isPassword(e.target)) root.dataset.mascotEyes = "shut";
    }
    function onBlur(e: FocusEvent) {
      if (e.target instanceof HTMLInputElement) delete root.dataset.mascotEyes;
    }
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      delete root.dataset.mascotEyes;
    };
  }, []);
}
