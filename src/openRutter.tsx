import styled from "@emotion/styled";
import React from "react";
import ReactDOM from "react-dom";

const StyledContainer = styled.div``;

const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 700;

function getNonce(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export default function (
  container: HTMLSpanElement,
  publicKey: string,
  onComplete: any,
  onExit: any,
  devObj: any,
  openOptions: any
) {
  ReactDOM.render(
    <Wrapper
      publicKey={publicKey}
      onComplete={onComplete}
      onExit={onExit}
      dev={devObj}
      platform={openOptions?.platform}
      storeName={openOptions?.storeName}
      region={openOptions?.region}
      autoLoad={openOptions?.autoLoad}
    ></Wrapper>,
    container
  );
}

type WrapperProps = {
  publicKey: string;
  onComplete: any;
  onExit: any;
  dev: any;
  platform?: string;
  storeName?: string; // Only for Shopify
  region?: string; // Only for Amazon
  autoLoad?: boolean;
};

function Wrapper(props: WrapperProps) {
  const {
    publicKey,
    onComplete,
    onExit,
    dev,
    platform,
    storeName,
    region,
    autoLoad,
  } = props;
  const [complete, setComplete] = React.useState(false);
  const [stateNonce] = React.useState(getNonce(5));
  const [openWindow, setOpenWindow] = React.useState<any>(null);
  // console.log(dev);
  const IFRAME_URL =
    process.env.NODE_ENV === "development" || dev?.openLocalhost
      ? "http://localhost:3000"
      : "https://link.rutterapi.com";
  let iframeUri = `${IFRAME_URL}?token=${publicKey}&origin=${encodeURIComponent(
    window.location.origin
  )}&nonce=${stateNonce}`;
  if (platform) {
    iframeUri += `&platform=${platform}`;
  }
  if (storeName) {
    iframeUri += `&storeName=${storeName}`;
  }
  if (region) {
    iframeUri += `&region=${region.toUpperCase()}`;
  }
  if (autoLoad) {
    iframeUri += `&autoLoad=true`;
  }
  const [iframeUrl, setFrameUrl] = React.useState(iframeUri);

  React.useEffect(() => {
    const newWindow = popupCenter(iframeUri, "rutterlinkwindow");
    const popupTick = setInterval(() => {
      if (newWindow!.closed) {
        clearInterval(popupTick);
        setComplete(true);
      }
    }, 500);
    setOpenWindow(newWindow);
  }, []);

  function handleMessage(event) {
    if (event.origin.startsWith(IFRAME_URL)) {
      // The data was sent from your site.
      // Data sent with postMessage is stored in event.data:
      try {
        const parsedMessage = JSON.parse(event.data);
        const { nonce: frameNonce } = parsedMessage;
        if (frameNonce !== stateNonce) {
          // DIFFERENT FRAME
          return;
        }
        // Handle message (public token only for now)
        // console.log(event.data);
        const { type } = parsedMessage;
        if (type === "SUCCESS" && !complete) {
          const { publicToken } = parsedMessage;
          onComplete(publicToken);
          setComplete(true);
        } else if (type === "EXIT") {
          if (onExit) {
            onExit();
          }
          openWindow.close();
          setComplete(true);
        } else if (type === "OAUTH_INITIATE") {
          const { link } = parsedMessage;
          setFrameUrl(link);
          // console.log("SET URL");
        }
      } catch (e: any) {
        // link
        fetch(
          "https://hooks.slack.com/services/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",
          {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({
              text: "LINK_ERROR: " + e.message,
            }),
          }
        );
        return;
      }
    } else {
      // The data was NOT sent from your site!
      // Be careful! Do not use it. This else branch is
      // here just for clarity, you usually shouldn't need it.
      return;
    }
  }

  // console.log(iframeUrl);
  React.useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  });

  if (complete) {
    // unhide the actual screen
    return null;
  }

  return <StyledContainer></StyledContainer>;
}

function popupCenter(url: string, title: string) {
  var y = window.outerHeight / 2 + window.screenY - WINDOW_HEIGHT / 2;
  var x = window.outerWidth / 2 + window.screenX - WINDOW_WIDTH / 2;
  return window.open(
    url,
    title,
    `menubar=1, resizable=no, width=${WINDOW_WIDTH}, height=${WINDOW_HEIGHT}, top=${y}, left=${x}`
  );
}
