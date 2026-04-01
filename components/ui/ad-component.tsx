import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdComponentProps {
  adSlot?: string;
}

const AdComponent = ({ adSlot }: AdComponentProps) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Error loading ad:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
       data-ad-client="ca-pub-9410578522426844"
       data-ad-slot={adSlot || "4787623283"}
       data-ad-format="auto"
       data-full-width-responsive="true"
    ></ins>
  );
};

export { AdComponent };
