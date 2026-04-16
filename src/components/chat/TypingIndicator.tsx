const TypingIndicator = ({ name }: { name: string }) => (
  <div className="flex justify-start mb-2.5" style={{ animation: "slide-up-spring 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>
    <div className="rounded-[20px] rounded-bl-[6px] px-4 py-3 bg-[hsl(152_60%_45%/0.10)] border border-[hsl(152_60%_45%/0.08)]">
      <p className="text-[10px] font-semibold text-emerald-400 mb-1">{name}</p>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-emerald-400/50"
            style={{
              animation: "typing-bounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

export default TypingIndicator;
