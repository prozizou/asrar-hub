import { useEffect, useRef } from "react";

const CloudinaryUploader = ({ onUploadSuccess, buttonText = "Télécharger un média", className = "" }) => {
  const cloudinaryRef = useRef();
  const widgetRef = useRef();

  useEffect(() => {
    // Charger le script Cloudinary une seule fois
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      document.body.appendChild(script);
    }

    cloudinaryRef.current = window.cloudinary;
    widgetRef.current = cloudinaryRef.current?.createUploadWidget(
      {
        cloudName: 'dqixuyqqh',
        uploadPreset: 'AsrarPro',
        sources: ['local', 'url', 'camera', 'dropbox', 'google-drive'],
        resourceType: 'auto',
        multiple: false,
        cropping: false,
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          onUploadSuccess(result.info.secure_url);
        }
        if (error) {
          console.error("Erreur Cloudinary:", error);
        }
      }
    );
  }, [onUploadSuccess]);

  const handleClick = () => {
    widgetRef.current?.open();
  };

  return (
    <button type="button" onClick={handleClick} className={className || "cloudinary-uploader-btn"}>
      {buttonText}
    </button>
  );
};

export default CloudinaryUploader;