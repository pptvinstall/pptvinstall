export function ReviewCTA() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
      <div className="text-4xl mb-3">⭐</div>
      <h3 className="text-2xl font-bold mb-2">Love your new setup?</h3>
      <p className="text-blue-100 mb-6 max-w-md mx-auto">
        A quick review helps other Atlanta homeowners find us — and means the world to us.
      </p>
      <a
        href="https://g.page/r/CR7z0j9VraqQEAI/review"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-full bg-white text-blue-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors"
      >
        ⭐ Leave a Google Review
      </a>
      <p className="text-blue-200 text-sm mt-4">Takes less than 60 seconds 🙏</p>
    </div>
  );
}
