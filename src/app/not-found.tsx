import Link from "next/link";
export default function NotFound() {
  return <div className="py-20 text-center"><h1 className="text-xl font-semibold">공고를 찾을 수 없습니다</h1><Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">목록으로</Link></div>;
}
