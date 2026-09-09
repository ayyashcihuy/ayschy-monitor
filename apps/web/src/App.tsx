import { BrowserRouter, Route, Routes } from "react-router-dom";
import VpsList from "./pages/VpsList";
import VpsDetail from "./pages/VpsDetail";
import AddVps from "./pages/AddVps";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VpsList />} />
        <Route path="/vps/new" element={<AddVps />} />
        <Route path="/vps/:id" element={<VpsDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
