import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, TriangleAlert, MapPin, Phone, Clock, ChefHat, Store, Truck, Utensils, Globe, Camera } from 'lucide-react';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ position }) {
  const map = useMap();
  const hasCentered = React.useRef(false);

  useEffect(() => {
    if (position && !hasCentered.current) {
      map.setView([position.lat, position.lng], map.getZoom());
      hasCentered.current = true;
    }
  }, [position, map]);
  return null;
}

function LocationPicker({ position, setPosition, setAddress }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      
      // Reverse Geocoding to get address name
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          // Extract specific parts or use full display_name
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
          const road = data.address.road || '';
          const neighborhood = data.address.neighbourhood || '';
          const addressText = [road, neighborhood, city].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');
          setAddress(addressText);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    },
  });

  return position ? <Marker position={position} /> : null;
}

function RestaurantSettings({ profile, onUpdate }) {
  const [formData, setFormData] = useState({
    restaurantName: '',
    location: '',
    phone: '',
    cuisineType: '',
    restaurantType: '',
    serviceType: '',
    openingTime: '',
    closingTime: '',
    latitude: null,
    longitude: null
  });

  const [mapPosition, setMapPosition] = useState(null); // Default to null instead of KTM
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const isInitialized = React.useRef(false);

  useEffect(() => {
    if (profile && !isInitialized.current) {
      setFormData({
        restaurantName: profile.restaurantName || '',
        location: profile.location || '',
        phone: profile.phone || '',
        cuisineType: profile.cuisineType || '',
        restaurantType: profile.restaurantType || '',
        serviceType: profile.serviceType || '',
        openingTime: profile.openingTime || '',
        closingTime: profile.closingTime || '',
        latitude: profile.latitude ?? null,
        longitude: profile.longitude ?? null
      });
      setLogoPreview(profile.logo || '');
      
      if (profile.latitude && profile.longitude) {
        setMapPosition({ lat: parseFloat(profile.latitude), lng: parseFloat(profile.longitude) });
      }
      isInitialized.current = true;
    }
  }, [profile]);

  // Update formData when mapPosition changes (manual clicks)
  useEffect(() => {
    if (mapPosition && isInitialized.current) {
      setFormData(prev => ({ 
        ...prev, 
        latitude: parseFloat(mapPosition.lat), 
        longitude: parseFloat(mapPosition.lng) 
      }));
    }
  }, [mapPosition]);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: '' }), 3000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const imageUrl = await uploadImageToCloudinary(file);
        setLogoPreview(imageUrl);
      } catch (err) {
        showToast('Failed to upload logo', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.put('/api/auth/restaurant/settings', {
        ...formData,
        logo: logoPreview
      }, { withCredentials: true });

      if (response.data.success) {
        showToast('Settings updated successfully!');
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rs-page">
      <div className="rk-content-header">
        <div className="rk-header-text">
          <div className="rk-breadcrumb">Business / Configuration</div>
          <h1>Profile Settings</h1>
          <p>Control how your restaurant appears to customers.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rs-grid">
        {/* Left Column: Branding & Core Info */}
        <div className="rs-col">
          <div className="rs-card">
            <div className="rs-card-header">
              <Camera size={18} />
              <h3>Identity & Branding</h3>
            </div>
            <div className="rs-card-body">
              <div className="rs-logo-section">
                <div className="rs-logo-box">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Restaurant Logo" />
                  ) : (
                    <div className="rs-logo-placeholder"><ChefHat size={32} /></div>
                  )}
                  <label className="rs-logo-upload">
                    <input type="file" hidden onChange={handleLogoChange} />
                    <Camera size={14} /> Update
                  </label>
                </div>
                <div className="rs-logo-info">
                  <h4>Restaurant Mark</h4>
                  <p>Recommended: 500x500px square image.</p>
                </div>
              </div>

              <div className="rs-form-group">
                <label>Restaurant Name</label>
                <div className="rs-input-wrap">
                  <Store size={16} />
                  <input type="text" name="restaurantName" value={formData.restaurantName} onChange={handleChange} required />
                </div>
              </div>

              <div className="rs-form-row">
                <div className="rs-form-group">
                  <label>Cuisine Style</label>
                  <div className="rs-input-wrap">
                    <Utensils size={16} />
                    <input type="text" name="cuisineType" value={formData.cuisineType} onChange={handleChange} placeholder="e.g. Italian" />
                  </div>
                </div>
                <div className="rs-form-group">
                  <label>Contact Phone</label>
                  <div className="rs-input-wrap">
                    <Phone size={16} />
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rs-card">
            <div className="rs-card-header">
              <Clock size={18} />
              <h3>Operations</h3>
            </div>
            <div className="rs-card-body">
              <div className="rs-form-row">
                <div className="rs-form-group">
                  <label>Opening Time</label>
                  <input type="time" name="openingTime" value={formData.openingTime} onChange={handleChange} />
                </div>
                <div className="rs-form-group">
                  <label>Closing Time</label>
                  <input type="time" name="closingTime" value={formData.closingTime} onChange={handleChange} />
                </div>
              </div>
              <div className="rs-form-row">
                <div className="rs-form-group">
                  <label>Service Mode</label>
                  <select name="serviceType" value={formData.serviceType} onChange={handleChange}>
                    <option value="dine-in">Dine In</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="delivery">Delivery</option>
                    <option value="all">All Modes</option>
                  </select>
                </div>
                <div className="rs-form-group">
                  <label>Business Category</label>
                  <select name="restaurantType" value={formData.restaurantType} onChange={handleChange}>
                    <option value="fine-dining">Fine Dining</option>
                    <option value="casual">Casual Dining</option>
                    <option value="fast-food">Fast Food</option>
                    <option value="cafe">Cafe / Bakery</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Location & Map */}
        <div className="rs-col">
          <div className="rs-card h-full">
            <div className="rs-card-header">
              <MapPin size={18} />
              <h3>Real-time Location</h3>
            </div>
            <div className="rs-card-body flex-1">
              <p className="rs-hint">Drop a pin directly on your restaurant's entrance for best results.</p>
              
              <div className="auth-map-preview" style={{ height: '400px' }}>
                <MapContainer 
                  center={mapPosition ? [mapPosition.lat, mapPosition.lng] : [27.7172, 85.3240]} 
                  zoom={15} 
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <RecenterMap position={mapPosition} />
                  <LocationPicker 
                    position={mapPosition} 
                    setPosition={setMapPosition} 
                    setAddress={(addr) => setFormData(prev => ({ ...prev, location: addr }))} 
                  />
                </MapContainer>
              </div>

              <div className="rs-form-group mt-6">
                <label>Display Address (User visible)</label>
                <div className="rs-input-wrap">
                  <Globe size={16} />
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    placeholder="e.g. Pulchowk, Lalitpur (Next to Labim)" 
                    required 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rs-floating-actions">
           <button type="submit" className="rs-save-btn" disabled={loading}>
             {loading ? 'Propagating Changes...' : 'Save Changes'}
           </button>
        </div>
      </form>

      {toast.message && (
        <div className={`rs-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.type === 'error' ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default RestaurantSettings;

