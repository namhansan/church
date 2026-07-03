export default async (request, context) => {
  const url = new URL(request.url);

  // 관리자 페이지와 로그인 시스템은 Basic Auth를 건너뜁니다
  // (여긴 이미 Netlify Identity 로그인으로 별도 보호되고 있어요)
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/.netlify/identity")
  ) {
    return context.next();
  }

  const auth = request.headers.get("authorization");
  const expected = "Basic " + btoa("reviewer:namhansan2026");

  if (auth !== expected) {
    return new Response("이 사이트는 준비 중입니다. 아이디와 비밀번호가 필요합니다.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="namhansansung-church"',
      },
    });
  }

  return context.next();
};

export const config = { path: "/*" };
