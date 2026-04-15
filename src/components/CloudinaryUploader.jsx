import { useEffect, useRef, useState } from "react";

const CloudinaryUploader = ({ onUploadSuccess, buttonText = "Télécharger un média", className = "" }) => {
  const cloudinaryRef = useRef();
  const widgetRef = useRef();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Fonction pour initialiser le widget une fois que Cloudinary est bien là
    const initWidget = () => {
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
      setIsLoaded(true);
    };

    // Vérifier si le script existe déjà
    if (!window.cloudinary) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      
      // On écoute la fin du chargement du script avant d'initialiser !
      script.onload = () => {
        initWidget();
      };
      
      script.onerror = () => {
        console.error("Échec du chargement du script Cloudinary");
      };
      
      document.body.appendChild(script);
    } else {
      // S'il est déjà là (par ex: on change de page et on revient), on initialise direct
      initWidget();
    }
  }, [onUploadSuccess]);

  const handleClick = () => {
    if (widgetRef.current) {
      widgetRef.current.open();
    } else {
      alert("L'outil de téléchargement est encore en cours de chargement. Veuillez patienter une seconde.");
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleClick} 
      className={className || "cloudinary-uploader-btn"}
      disabled={!isLoaded}
      style={{ opacity: isLoaded ? 1 : 0.6, cursor: isLoaded ? 'pointer' : 'wait' }}
    >
      {isLoaded ? buttonText : "Chargement de l'outil..."}
    </button>
  );
};

export default CloudinaryUploader;