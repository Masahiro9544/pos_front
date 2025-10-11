"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from '@zxing/library';

export default function Home() {
  const router = useRouter();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [productInfo, setProductInfo] = useState(null);
  const [purchaseList, setPurchaseList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [taxRate, setTaxRate] = useState(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  // 認証チェック
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      // トークンがない場合はウェルカム画面にリダイレクト
      router.push('/welcome');
    }
  }, [router]);

  // 税率を取得（tax_id=2）
  useEffect(() => {
    const fetchTaxRate = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/tax/2`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          let rate = Number(data.tax_rate);
          // データベースに10のような値が格納されている場合は100で割る
          if (rate > 1) {
            rate = rate / 100;
          }
          setTaxRate(rate);
        }
      } catch (error) {
        // エラー時はデフォルト値として0.10を使用
        setTaxRate(0.10);
      }
    };

    fetchTaxRate();
  }, []);

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
            const code = result.getText();
            setScannedCode(code);
            setSearchCode(code);
            setIsScanning(false);
            // スキャン成功時に自動で商品検索
            searchProductByCode(code);
            // カメラを自動終了
            closeCamera();
          }
        }
      );
    } catch (err) {
      // スキャンエラーを無視（ユーザーには表示しない）
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

  const searchProductByCode = async (code) => {
    if (!code.trim()) {
      alert('商品コードを入力してください');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/products?code=${code}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // トークンが無効な場合はウェルカム画面にリダイレクト
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        router.push('/welcome');
        return;
      }

      if (!response.ok) {
        throw new Error('商品が見つかりませんでした');
      }
      const data = await response.json();
      setProductInfo(data);
    } catch (error) {
      alert(error.message);
      setProductInfo(null);
    }
  };

  const handleSearch = async () => {
    searchProductByCode(searchCode);
  };

  const handleAddToCart = () => {
    if (!productInfo) return;

    const newItem = {
      id: Date.now(),
      prd_id: productInfo.prd_id,
      code: productInfo.code,
      name: productInfo.name,
      price: productInfo.price,
      quantity: 1,
    };

    setPurchaseList([...purchaseList, newItem]);
    setSearchCode("");
    setProductInfo(null);
  };

  const handleRemoveItem = (id) => {
    setPurchaseList(purchaseList.filter(item => item.id !== id));
  };

  const handleClearList = () => {
    setPurchaseList([]);
  };

  const calculateTotal = () => {
    if (taxRate === null) return 0;
    const TAX_MULTIPLIER = 1 + taxRate; // 税率を乗数に変換（例: 0.10 → 1.10）
    return purchaseList.reduce((total, item) => {
      const priceWithTax = Math.floor(item.price * TAX_MULTIPLIER);
      return total + (priceWithTax * item.quantity);
    }, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    router.push('/welcome');
  };

  const handlePurchase = async () => {
    if (purchaseList.length === 0) {
      alert('購入する商品がありません');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');

      // 購入リストをAPIリクエスト形式に変換
      const items = purchaseList.map(item => ({
        prd_id: item.prd_id,
        code: item.code,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          emp_cd: null
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
        router.push('/welcome');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || '購入処理に失敗しました');
      }

      const result = await response.json();
      setPurchaseResult(result);
      setShowModal(true);

    } catch (error) {
      alert(error.message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPurchaseResult(null);
    setPurchaseList([]);
    setSearchCode("");
    setProductInfo(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-4 mb-10 flex justify-between items-center">
        <h1 className="text-base font-bold">POSアプリ</h1>
        <button
          onClick={handleLogout}
          className="bg-[#DA1432] px-4 py-2 rounded text-xs text-white font-bold"
        >
          買い物を終了する
        </button>
      </header>

      <main className="flex-1 p-4">
        {!isCameraOpen ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <button
              onClick={openCamera}
              className="bg-[#005365] text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transform transition-transform active:scale-95"
            >
              バーコードをスキャン（カメラ起動）<br />📷
            </button>

            <div className="w-full max-w-md">
              
              {productInfo && (
                <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">商品情報</h4>
                  <div className="space-y-3">
                    <p className="text-base">{productInfo.name}</p>
                    <p className="text-xl font-bold text-gray-900">¥{productInfo.price.toLocaleString()}</p>
                    <button
                      onClick={handleAddToCart}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
                    >
                      追加
                    </button>
                  </div>
                </div>
              )}

              {/* 購入リスト */}
              {purchaseList.length > 0 && (
                <div className="mt-8 w-full max-w-md">
                  <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">購入リスト</h4>
                    <div className="space-y-2">
                      {purchaseList.map((item) => {
                        if (taxRate === null) return null;
                        const TAX_MULTIPLIER = 1 + taxRate; // 税率を乗数に変換（例: 0.10 → 1.10）
                        const priceWithTax = Math.floor(item.price * TAX_MULTIPLIER);
                        const totalPriceWithTax = priceWithTax * item.quantity;
                        return (
                          <div key={item.id} className="flex items-center justify-between py-2 border-b">
                            <div className="flex-1">
                              <span>{item.name}×{item.quantity}</span>
                              <span className="ml-4 text-gray-600">¥{item.price}</span>
                              <span className="ml-4 font-semibold">¥{priceWithTax}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-600 hover:text-red-800 text-sm ml-4"
                            >
                              削除
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>合計（税込）</span>
                        <span>¥{calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleClearList}
                      className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded-lg"
                    >
                      購入リストをクリア
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center h-full">
            <div className="w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">バーコードスキャン</h3>
                <button
                  onClick={closeCamera}
                  className="bg-[#DA1432] text-white px-4 py-2 rounded"
                >
                  閉じる
                </button>
              </div>

              <div className="bg-black rounded-lg overflow-hidden relative" style={{ aspectRatio: '4/3', maxHeight: '500px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white border-dashed w-60 h-48 rounded-lg animate-pulse"></div>
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
                    バーコードを画面中央に合わせてください
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 購入ボタン（購入リストに商品がある場合のみ表示） */}
      {purchaseList.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-gray-300 p-4 shadow-lg">
          <button
            onClick={handlePurchase}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-lg"
          >
            購入
          </button>
        </div>
      )}

      {/* 購入結果モーダル */}
      {showModal && purchaseResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-6 text-green-600">購入完了</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">取引ID</span>
                <span className="font-semibold">{purchaseResult.trd_id}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">合計金額（税抜）</span>
                <span className="font-semibold">¥{purchaseResult.ttl_amt_ex_tax.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">消費税額（10%）</span>
                <span className="font-semibold">¥{purchaseResult.tax_amt.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-t-2 border-gray-400">
                <span className="text-lg font-bold">合計金額（税込）</span>
                <span className="text-2xl font-bold text-green-600">¥{purchaseResult.total_amt.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-lg"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
