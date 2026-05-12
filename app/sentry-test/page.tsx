"use client";

export default function SentryTest() {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Sentry Test Page</h1>
      <p>Click the button below to trigger a client-side error and test Sentry.</p>
      <button
        onClick={() => {
          throw new Error("Sentry Test Error - Client Side");
        }}
        style={{
          padding: "10px 20px",
          backgroundColor: "#e0284f",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Trigger Client Error
      </button>
      <div style={{ marginTop: "20px" }}>
        <p>To test server-side errors, you can create a server action or an API route that throws an error.</p>
      </div>
    </div>
  );
}
