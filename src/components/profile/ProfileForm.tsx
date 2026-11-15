"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  type: "owner" | "customer";
}

interface FieldErrors {
  name?: string[];
  email?: string[];
  phone?: string[];
  address?: string[];
}

export function ProfileForm({ type }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = type === "owner" ? "/api/profile/owner" : "/api/profile/customer";
  const label = type === "owner" ? "Owner" : "Customer";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined, phone, address }),
      });

      const data = await res.json();

      if (res.status === 201 || res.status === 409) {
        router.push("/dashboard");
        return;
      }

      if (res.status === 400 && data.fields) {
        setFieldErrors(data.fields);
        return;
      }

      setGlobalError(data.error ?? "Something went wrong");
    } catch {
      setGlobalError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold">Create {label} Profile</h1>

        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: "Name", value: name, setter: setName, type: "text", key: "name" as const },
            { label: "Email (optional)", value: email, setter: setEmail, type: "email", key: "email" as const },
            { label: "Phone", value: phone, setter: setPhone, type: "tel", key: "phone" as const },
            { label: "Address", value: address, setter: setAddress, type: "text", key: "address" as const },
          ].map(({ label, value, setter, type: inputType, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={inputType}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fieldErrors[key]?.map((msg) => (
                <p key={msg} className="text-red-600 text-xs mt-1">{msg}</p>
              ))}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? "Creating..." : `Create ${label} Profile`}
          </button>
        </form>
      </div>
    </div>
  );
}
