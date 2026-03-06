const LoginHeader = () => {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-20 h-20 rounded-3xl bg-orange-50 flex items-center justify-center shrink-0 shadow-sm border border-orange-100 p-3">
        <img
          src="/logo.png"
          alt="Palap"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">
          WELCOME BACK
        </h2>
        <p className="text-sm font-medium text-slate-500 mt-1">เข้าสู่ระบบเพื่อใช้งาน Palap</p>
      </div>
    </div>
  );
};

export default LoginHeader;
