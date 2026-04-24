// ─── User avatar circle ───────────────────────────────────────────────────────
export default function Avatar({ user, size = 26, style = {} }) {
  if (!user) return null;
  return (
    <div
      title={user.name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: user.color + "30",
        border: "1.5px solid " + user.color + "60",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        color: user.color,
        flexShrink: 0,
        ...style,
      }}
    >
      {user.avatar}
    </div>
  );
}
