"use client";

import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { X, Save } from 'lucide-react';

interface ImageCropperModalProps {
  image: string;
  onCropComplete: (blob: Blob | null) => void;
  onClose: () => void;
}

export default function ImageCropperModal({ image, onCropComplete, onClose }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const onCropChange = (crop: { x: number; y: number }) => setCrop(crop);
  const onCropAreaChange = (_: unknown, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedArea(croppedAreaPixels);
  };

  const createImageBlob = async (imageUrl: string, cropPixels: { x: number; y: number; width: number; height: number }): Promise<Blob | null> => {
    const image = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    return new Promise((resolve) => {
      image.onload = () => {
        canvas.width = cropPixels.width;
        canvas.height = cropPixels.height;

        ctx?.drawImage(
          image,
          cropPixels.x,
          cropPixels.y,
          cropPixels.width,
          cropPixels.height,
          0,
          0,
          cropPixels.width,
          cropPixels.height
        );

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      };
      image.src = imageUrl;
    });
  };

  const onSave = async () => {
    const blob = await createImageBlob(image, croppedArea);
    onCropComplete(blob);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-navy-900 rounded-3xl border border-accent-500/30 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Cortar Imagem</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-navy-800 hover:bg-navy-700 flex items-center justify-center active:scale-90 transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        <div className="relative h-80 bg-black rounded-2xl overflow-hidden mb-6 border-2 border-accent-500/20">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={setZoom}
            onCropAreaChange={onCropAreaChange}
            classes={{
              container: 'cropper-container',
              cropper: 'cropper-rotate-enabled',
              cropArea: 'cropper-crop-area',
              media: 'cropper-media'
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70 mb-2">Zoom (1.0x - 3.0x)</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer slider-purple"
            />
            <div className="flex justify-between text-xs text-white/40">
              <span>1.0x</span>
              <span>2.0x</span>
              <span>3.0x</span>
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={!croppedArea}
            className="w-full py-4 bg-accent-600 hover:bg-accent-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-2xl font-medium text-white flex items-center justify-center gap-2"
          >
            <Save size={20} />
            salvar
          </button>
        </div>
      </div>
    </div>
  );
}
