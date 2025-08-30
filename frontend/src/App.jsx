import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import QACheck from './pages/QACheck';

function App() {
	return (
	<Router>
		<Routes>
		<Route path="/" element={<Landing />} />
		<Route path="/login/:userType" element={<Login />} />
		<Route path="/buyer" element={<BuyerDashboard />} />
		<Route path="/seller" element={<SellerDashboard />} />
		<Route path="/qa" element={<QACheck />} />
		</Routes>
	</Router>
	);
}

export default App;