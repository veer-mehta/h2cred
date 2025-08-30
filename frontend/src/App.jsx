import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import SellerDashboard from "./pages/SellerDashboard.jsx";
import Login from "./pages/Login.jsx";
import QACheck from "./pages/QACheck.jsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login/:userType" element={<Login />} />
                <Route path="/buyer" element={<BuyerDashboard />} />
                <Route path="/seller" element={<SellerDashboard />} />
                <Route path="/qa" element={<QACheck />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
