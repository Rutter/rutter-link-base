type LinkConfig = {
  publicKey: string;
  onSuccess: (publicToken?: string) => any;
  onLoad: () => any;
  onExit: (err?: string) => any;
  dev?: {
    openLocalhost?: string;
    openUrl?: string;
  }; // internal use only
  debug?: boolean;
};

type LinkObject = {
  open: any;
  exit: any;
  destroy: any;
};

type PlatformNames =
  | "shopify"
  | "bigcommerce"
  | "etsy"
  | "square"
  | "squarespace"
  | "amazon"
  | "woocommerce"
  | "magento"
  | "shopify"
  | "etsy"
  | "bigcommerce"
  | "big_commerce"
  | "square"
  | "squarespace"
  | "wix"
  | "magento"
  | "woocommerce"
  | "woo_commerce"
  | "amazon"
  | "ebay"
  | "prestashop"
  | "recurly"
  | "stripe"
  | "paypal"
  | "shopee"
  | "shoper"
  | "shopware"
  | "fnac"
  | "lazada"
  | "freshbooks"
  | "quickbooks"
  | "quickbooks_desktop"
  | "xero"
  | "mercadoLibre"
  | "netsuite"
  | "zohobooks"
  | "sagebusinesscloud"
  | "chargebee"
  | "chargify"
  | "sageintacct"
  | "gumroad"
  | "wave"
  | "dynamics365";

type OpenOptions = {
  platform?: PlatformNames;
  storeName?: string; // Only for Shopify
  region?: string; // Only for Amazon
  autoLoad?: boolean;
};

function getNonce(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 700;

function debugLog(shouldDebug, ...optionalParams: any[]) {
  if (shouldDebug) {
    console.log("[Rutter Link] ", ...optionalParams);
  }
}

var Rutter = {
  create: (
    config: LinkConfig = {
      publicKey: "sandbox_pk_d4b48f90-ff3b-456e-a8e2-1da7af1ab609",
      onSuccess: () => {
        // success
      },
      onLoad: () => {
        // load
      },
      onExit: () => {
        // exit
      },
      debug: false,
    }
  ): LinkObject => {
    // handle passed in variables and initialize Link component
    let openedWindow: any = null;
    return {
      open: (options?: OpenOptions) => {
        debugLog(config.debug, "[trigger] open function called");
        const { onSuccess, onExit, publicKey, dev } = config;
        let container = document.createElement("span");
        container.className = "selectorgadget_ignore";
        document.body.appendChild(container);
        (window as any).Rutter._rutterContainer = container;
        let authComplete = false;

        debugLog(config.debug, "[Internal] setting backend URI");
        // MUST CALL window.open IMMEDIATELY OTHERWISE POPUP BLOCKED ON MOBILE
        let defaultUrl = "https://production.rutterapi.com";
        if (dev?.openUrl) {
          if (dev?.openUrl) {
            defaultUrl = dev.openUrl;
          } else {
            defaultUrl = "http://localhost:4000";
          }
        }
        debugLog(
          config.debug,
          "[Internal] successfully set backend URI to ",
          defaultUrl
        );
        const nonce = getNonce(5);
        let iframeUri = `${defaultUrl}/linkstart/${publicKey}?token=${publicKey}&origin=${encodeURIComponent(
          window.location.origin
        )}&nonce=${nonce}`;
        if (options?.platform) {
          iframeUri += `&platform=${options.platform}`;
        }
        if (options?.storeName) {
          iframeUri += `&storeName=${options.storeName}`;
        }
        if (options?.region) {
          iframeUri += `&region=${options.region.toUpperCase()}`;
        }
        if (options?.autoLoad) {
          iframeUri += `&autoLoad=true`;
        }
        debugLog(config.debug, "Generating pop up window...");
        const newWindow = popupCenter(iframeUri, "rutterlinkwindow");
        debugLog(config.debug, "Popup window generated");
        openedWindow = newWindow;
        const popupTick = setInterval(() => {
          if (newWindow?.closed) {
            if (!authComplete && onExit) {
              debugLog(
                config.debug,
                "Popup window closed before authentication completed"
              );
              onExit("MERCHANT_CLOSED");
            }
            debugLog(
              config.debug,
              "[Internal] Removing message event listener"
            );
            window.removeEventListener("message", handleMessage);
            clearInterval(popupTick);
          }
        }, 500);
        function handleMessage(event) {
          if (typeof event.data === "string") {
            try {
              debugLog(
                config.debug,
                "[Internal] Received message from Popup window"
              );
              const parsedMessage = JSON.parse(event.data);
              const { nonce: frameNonce } = parsedMessage;
              if (frameNonce !== nonce) {
                debugLog(
                  config.debug,
                  "[Internal] Nonce mismatch, ignoring message"
                );
                // DIFFERENT Rutter Link window is posting message to this instance of Rutter Link
                return;
              }
              // Handle message (public token only for now)
              const { type } = parsedMessage;
              if (type === "SUCCESS") {
                debugLog(
                  config.debug,
                  "[Internal] Received success message from Popup window"
                );
                const { publicToken } = parsedMessage;
                authComplete = true;
                if (onSuccess) {
                  debugLog(config.debug, "Calling onSuccess callback");
                  onSuccess(publicToken);
                }
              } else if (type === "EXIT") {
                if (onExit) {
                  debugLog(config.debug, "Calling onExit callback");
                  onExit();
                }
                newWindow?.close();
              }
              return;
            } catch (e: any) {
              debugLog(config.debug, "Encountered error", e);
              if (e.message?.includes("Unexpected")) {
                // ignore non JSON messages
                return;
              }
              // link
              if (dev?.openUrl) {
                console.error(e);
              }
            }
            if (onExit) {
              onExit("UNKNOWN_ERROR");
              return;
            }
          }
        }
        window.addEventListener("message", handleMessage);
      }, // can call openRutter function to do the react stuff
      exit: () => {
        if (openedWindow) {
          openedWindow.close();
        }
        if ((window as any).Rutter._rutterContainer) {
          (window as any).Rutter._rutterContainer.remove();
        }
      },
      destroy: () => {
        if (openedWindow) {
          openedWindow.close();
        }
        if ((window as any).Rutter._rutterContainer) {
          (window as any).Rutter._rutterContainer.remove();
        }
      },
    };
  },
};

(window as any).Rutter = Rutter;

function popupCenter(url: string, title: string) {
  var y = window.outerHeight / 2 + window.screenY - WINDOW_HEIGHT / 2;
  var x = window.outerWidth / 2 + window.screenX - WINDOW_WIDTH / 2;
  return window.open(
    url,
    title,
    `menubar=1, resizable=no, width=${WINDOW_WIDTH}, height=${WINDOW_HEIGHT}, top=${y}, left=${x}`
  );
}
