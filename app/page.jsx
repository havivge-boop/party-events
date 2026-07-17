// זה עמוד הבית (yoursite.com/ בלי כלום אחרי זה) - לא חובה שיהיה בו משהו מיוחד
// כי אף אחד לא באמת ייכנס לכתובת הזו - כולם ייכנסו ישר ל /e/שם-האירוע

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0B10] text-white flex items-center justify-center px-6 text-center">
      <p className="text-white/50 text-sm">זו הבמה של האירועים שלך. כל אירוע נמצא בכתובת /e/שם-האירוע</p>
    </div>
  );
}
