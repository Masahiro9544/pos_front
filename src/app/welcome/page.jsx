"use client";
import { useRouter } from "next/navigation";

export default function Welcome() {
  const router = useRouter();

  const handleStartShopping = async () => {
    try {
      // バックエンドに認証リクエストを送信してユーザー番号とトークンを取得
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/auth/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('認証に失敗しました');
      }

      const data = await response.json();

      // トークンとユーザー番号をlocalStorageに保存
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('userId', data.user_id);

      // POSアプリのホーム画面に遷移
      router.push('/home');
    } catch (error) {
      alert('買い物を開始できませんでした。もう一度お試しください。');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold drop-shadow-lg">
            POSアプリへようこそ
          </h1>
          <p className="text-base text-blue-500">
            簡単・便利にお買い物ができます
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-auto">
          <div className="space-y-6">
            <div className="text-gray-700">
              <h2 className="text-xl font-semibold mb-4">ご利用方法</h2>
              <ul className="text-left space-y-3">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">1.</span>
                  <span>下のボタンをタップして買い物を開始</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">2.</span>
                  <span>商品のバーコードをスキャン</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">3.</span>
                  <span>お会計を完了</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleStartShopping}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-8 rounded-xl text-l shadow-lg transform transition-all active:scale-95 hover:shadow-xl"
            >
              買い物を始める
            </button>
          </div>
        </div>

        <p className="text-blue-500 text-sm">
          問題が発生した場合は、スタッフまでお声がけください
        </p>
      </div>
    </div>
  );
}
