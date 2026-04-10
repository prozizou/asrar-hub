import { WidgetLoader, Widget } from 'react-cloudinary-upload-widget';

const CloudinaryUploader = ({ onUploadSuccess, buttonText = "Télécharger un média", className = "" }) => {
  const handleSuccess = (result) => {
    const mediaUrl = result?.info?.secure_url;
    if (mediaUrl && onUploadSuccess) {
      onUploadSuccess(mediaUrl);
    }
  };

  const handleFailure = (error) => {
    console.error("Erreur d'upload Cloudinary:", error);
    alert("Échec de l'upload. Vérifiez la console.");
  };

  const cloudName = 'dqixuyqqh';
  const uploadPreset = 'AsrarPro';

  return (
    <>
      <WidgetLoader />
      <Widget
        sources={['local', 'url', 'camera', 'dropbox', 'google-drive']}
        resourceType={'auto'}
        cloudName={cloudName}
        uploadPreset={uploadPreset}
        buttonText={buttonText}
        className={className || "cloudinary-uploader-btn"}
        onSuccess={handleSuccess}
        onFailure={handleFailure}
        logging={false}
        cropping={false}
        multiple={false}
        autoClose={true}
      />
    </>
  );
};

export default CloudinaryUploader;