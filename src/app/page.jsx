"use client";
import { useState, useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from '@zxing/library';

export default function Home() {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [productInfo, setProductInfo] = useState(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const openCamera = async () => {
    setIsCameraOpen(true);
    // startScanning()でカメラアクセスとスキャンを開始
    setTimeout(() => startScanning(), 100);
  };

  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current) return;

    setIsScanning(true);
    try {
      const result = await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            setScannedCode(result.getText());
            setIsScanning(false);
          }
        }
      );
    } catch (err) {
      console.error('スキャンエラー:', err);
    }
  };

  const closeCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }

    setIsCameraOpen(false);
    setIsScanning(false);
    setScannedCode("");
  };

  const handleManualSearch = async () => {
    if (!manualCode.trim()) {
      alert('商品コードを入力してください');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/products?code=${manualCode}`);
      if (!response.ok) {
        throw new Error('商品が見つかりませんでした');
      }
      const data = await response.json();
      setProductInfo(data);
    } catch (error) {
      console.error('商品検索エラー:', error);
      alert(error.message);
      setProductInfo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 text-white p-4 text-center">
        <h1 className="text-xl font-bold">POSアプリ</h1>
      </header>

      <main className="flex-1 p-4">
        {!isCameraOpen ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                商品をスキャン
              </h2>
              <p className="text-gray-600">
                バーコードまたはQRコードをスキャンしてください
              </p>
            </div>

            <button
              onClick={openCamera}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transform transition-transform active:scale-95"
            >
              📷 スキャン（カメラ）
            </button>

            <div className="w-full max-w-md">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">手動入力</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    placeholder="商品コードを入力"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleManualSearch}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg"
                  >
                    検索
                  </button>
                </div>
              </div>

              {productInfo && (
                <div className="mt-4 bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">商品情報</h4>
                  <div className="space-y-2">
                    <p><span className="font-semibold">商品コード:</span> {productInfo.code}</p>
                    <p><span className="font-semibold">商品名:</span> {productInfo.name}</p>
                    <p><span className="font-semibold">価格:</span> ¥{productInfo.price.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">カメラスキャン</h3>
              <button
                onClick={closeCamera}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                閉じる
              </button>
            </div>

            <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg animate-pulse"></div>
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              {scannedCode ? (
                <div className="bg-green-100 border border-green-400 rounded-lg p-4 mb-4">
                  <h4 className="text-green-800 font-semibold mb-2">スキャン成功!</h4>
                  <p className="text-green-700 break-all">{scannedCode}</p>
                  <button
                    onClick={() => {
                      setScannedCode("");
                      startScanning();
                    }}
                    className="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    再スキャン
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  バーコードまたはQRコードを画面中央に合わせてください
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
