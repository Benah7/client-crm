import React, { useState } from "react";

interface Client {
  name: string;
  phone: string;
  date: string;
  price: number;
}

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [price, setPrice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !date || !price) return;

    const newClient: Client = {
      name,
      phone,
      date,
      price: Number(price),
    };
    setClients([...clients, newClient]);

    // איפוס שדות
    setName("");
    setPhone("");
    setDate(new Date().toISOString().split("T")[0]);
    setPrice("");
  };

  const total = clients.reduce((sum, c) => sum + c.price, 0);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center text-green-600 mb-6">
          מערכת ניהול ימי צילום
        </h1>

        {/* טופס */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="שם לקוח"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="tel"
            placeholder="מספר טלפון"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            type="number"
            placeholder="מחיר (₪)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition"
          >
            שמור
          </button>
        </form>

        {/* טבלה */}
        <h2 className="text-lg font-semibold text-green-600 mt-6 mb-2">
          לקוחות שנשמרו
        </h2>
        <table className="w-full border text-right">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">שם</th>
              <th className="p-2 border">טלפון</th>
              <th className="p-2 border">תאריך</th>
              <th className="p-2 border">מחיר</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c, i) => (
              <tr key={i} className="text-center">
                <td className="p-2 border">{c.name}</td>
                <td className="p-2 border">{c.phone}</td>
                <td className="p-2 border">{c.date}</td>
                <td className="p-2 border">{c.price} ₪</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 font-bold text-right">
          סה"כ סכום כל הרשומות: {total} ₪
        </p>
      </div>
    </div>
  );
}
