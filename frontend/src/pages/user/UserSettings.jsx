import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Camera, Save, MapPin, Globe, CheckCircle2, TriangleAlert } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import UserNavbar from '../../components/shared/UserNavbar';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import './UserSettings.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);
  return null;
}

function LocationPicker({ position, setPosition, setAddress }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        if (data && data.display_name) {
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
          const road = data.address.road || '';
          const neighborhood = data.address.neighbourhood || '';
          const addressText = [road, neighborhood, city].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 3).join(',');
          if (setAddress) setAddress(addressText);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    },
  });
  return position ? <Marker position={position} /> : null;
}

function UserSettings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    logo: '',
    location: '',
    latitude: null,
    longitude: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [imagePreview, setImagePreview] = useState('');
  const [mapPosition, setMapPosition] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/profile', { withCredentials: true });
      if (response.data.success) {
        setProfile(response.data.data);
        setImagePreview(response.data.data.logo || '');
        if (response.data.data.latitude && response.data.data.longitude) {
          setMapPosition({ 
            lat: parseFloat(response.data.data.latitude), 
            lng: parseFloat(response.data.data.longitude) 
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
        return;
      }
      try {
        setSaving(true);
        setMessage({ type: 'info', text: 'Uploading photo...' });
        const imageUrl = await uploadImageToCloudinary(file);
        setImagePreview(imageUrl);
        setProfile({ ...profile, logo: imageUrl });
        setMessage({ type: 'success', text: 'Photo uploaded! Save to update profile.' });
      } catch (err) {
        setMessage({ type: 'error', text: err.message || 'Failed to upload photo' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      let lat = mapPosition ? mapPosition.lat : null;
      let lng = mapPosition ? mapPosition.lng : null;

      // If user provided a location string but no map pin, we can clear the lat/lng 
      // so the dashboard's automatic geocoding can take over for their text.
      
      const payload = {
        name: profile.name,
        logo: profile.logo,
        location: profile.location,
        latitude: lat,
        longitude: lng
      };

      const response = await axios.put('/api/auth/profile', payload, { withCredentials: true });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
      } else {
        setMessage({ type: 'error', text: response.data.message || 'Failed to update profile' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Server error. Please try again later.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <UserNavbar />
        <div className="dashboard-content">
          <div className="loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <UserNavbar />
      
      <div className="dashboard-content">
        <div className="settings-container">
          <div className="settings-header">
            <h1>Account Settings</h1>
            <p>Manage your profile and delivery location</p>
          </div>

          <div className="settings-card">
            {message.text && (
              <div className={`settings-alert ${message.type === 'error' ? 'error' : 'success'}`}>
                {message.type === 'error' ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="settings-form">
              <div className="profile-photo-section">
                <div className="photo-display">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="profile-large-img" />
                  ) : (
                    <div className="profile-placeholder-large">
                      <User size={48} />
                    </div>
                  )}
                  <label htmlFor="photo-upload" className="photo-upload-label" title="Change Photo">
                    <Camera size={20} />
                    <input 
                      id="photo-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden-input"
                    />
                  </label>
                </div>
                <div className="photo-info">
                  <h3>Profile Picture</h3>
                  <p>JPG or PNG. Max size 5MB.</p>
                </div>
              </div>

              <div className="settings-grid">
                <div className="settings-field">
                  <label><User size={16} /> Full Name</label>
                  <div className="rs-input-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="settings-input"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>

                <div className="settings-field disabled">
                  <label><Mail size={16} /> Email Address</label>
                  <input
                    type="email"
                    className="settings-input"
                    value={profile.email}
                    disabled
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="us-location-card">
                <div className="settings-header" style={{ marginTop: '20px', marginBottom: '10px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={20} color="var(--brand)" /> 
                    Delivery Location
                  </h3>
                  <p>Drop a pin on your address for precise deliveries.</p>
                </div>

                <div className="us-map-wrapper auth-map-preview">
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
                      setAddress={(addr) => setProfile(prev => ({ ...prev, location: addr }))}
                    />
                  </MapContainer>
                </div>

                <div className="settings-field" style={{ marginTop: '20px' }}>
                  <label><Globe size={16} /> Address Description</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    placeholder="e.g. House No. 12, Kathmandu"
                    required
                  />
                </div>
              </div>

              <div className="settings-footer">
                <button type="submit" className="save-settings-btn" disabled={saving}>
                  {saving ? 'Saving...' : (
                    <>
                      <Save size={18} />
                      Save Profile & Location
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
