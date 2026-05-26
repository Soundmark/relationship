import { useRef, useState, useCallback } from "react";
import { Button, Modal } from "antd";
import Cropper from "react-cropper";

interface ImageCropperProps {
  imageSrc: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: (croppedImage: string) => void;
}

export default function ImageCropper({
  imageSrc,
  open,
  onCancel,
  onConfirm,
}: ImageCropperProps) {
  const cropperRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = useCallback(() => {
    const imageElement = cropperRef.current;
    if (!imageElement) return;

    // Get cropper instance from the image element
    const cropper = (imageElement as any).cropper;
    if (!cropper) return;

    setIsProcessing(true);

    try {
      // Get cropped canvas with fixed size for avatar
      const canvas = cropper.getCroppedCanvas({
        width: 240,
        height: 240,
        fillColor: "#fff",
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });

      if (canvas) {
        const croppedImage = canvas.toDataURL("image/jpeg", 0.9);
        onConfirm(croppedImage);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm]);

  return (
    <>
      <Modal
        title="裁剪头像"
        open={open}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>
            取消
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={isProcessing}
            onClick={handleConfirm}
            style={{
              backgroundColor: "#E8A87C",
              borderColor: "#E8A87C",
            }}
          >
            确定
          </Button>,
        ]}
        width={320}
        centered
      >
        <div className="flex justify-center py-4">
          <Cropper
            src={imageSrc}
            style={{ height: 240, width: "100%" }}
            aspectRatio={1}
            viewMode={1}
            dragMode="move"
            guides={true}
            center={true}
            highlight={false}
            background={false}
            autoCropArea={0.8}
            cropBoxMovable={true}
            cropBoxResizable={true}
            toggleDragModeOnDblclick={false}
            responsive={true}
            ref={cropperRef}
          />
        </div>
        <p className="text-center text-sm" style={{ color: "#8B7355" }}>
          拖动和缩放来调整头像位置
        </p>
      </Modal>
      <style jsx global>{`
        .cropper-crop-box {
          border-radius: 50% !important;
        }
        .cropper-face {
          border-radius: 50% !important;
        }
        .cropper-view-box {
          border-radius: 50% !important;
          outline: none !important;
        }
      `}</style>
    </>
  );
}
