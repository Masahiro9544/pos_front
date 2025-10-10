"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // ウェルカム画面にリダイレクト
    router.push('/welcome');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-600">読み込み中...</p>
    </div>
  );
}
