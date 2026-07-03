export default async (request, context) => {
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
