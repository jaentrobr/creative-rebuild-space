import { forwardRef, useImperativeHandle, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/security";

export type CaptchaHandle = { reset: () => void };

type Props = {
  onToken: (token: string) => void;
  className?: string;
};

/**
 * Widget do Cloudflare Turnstile.
 * Use `ref.current?.reset()` depois de cada tentativa (sucesso ou erro) para gerar novo token.
 */
export const Captcha = forwardRef<CaptchaHandle, Props>(function Captcha({ onToken, className }, ref) {
  const instance = useRef<TurnstileInstance | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onToken("");
      instance.current?.reset();
    },
  }));

  return (
    <div className={className}>
      <Turnstile
        ref={instance}
        siteKey={TURNSTILE_SITE_KEY}
        options={{ language: "pt-br", size: "flexible" }}
        onSuccess={(token) => onToken(token)}
        onError={() => onToken("")}
        onExpire={() => onToken("")}
      />
    </div>
  );
});
