/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { Search, Car, MapPin, Navigation, Info, Settings, PanelLeftClose, PanelLeft, Clock, DollarSign, Ruler } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { ParkingLot, VehicleInfo, VehicleType } from './types/parking';
import { twd97_to_wgs84 } from './lib/coordinates';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function App() {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleInfo>(() => {
    const saved = localStorage.getItem('vehicleInfo');
    return saved ? JSON.parse(saved) : { type: VehicleType.CAR, width: 1.8, height: 1.6, length: 4.8 };
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/parking');
        setParkingLots(response.data);
      } catch (error) {
        console.error('Failed to fetch parking data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('vehicleInfo', JSON.stringify(vehicle));
  }, [vehicle]);

  const filteredLots = useMemo(() => {
    return parkingLots.filter(lot => 
      lot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parkingLots, searchTerm]);

  // Extract height limit from description if possible
  const getHeightLimit = (lot: ParkingLot) => {
    const text = (lot.summary + lot.payex + (lot as any).introduction).toLowerCase();
    const match = text.match(/限高([0-9.]+)/) || text.match(/高度限制([0-9.]+)/);
    if (match) return parseFloat(match[1]);
    return null;
  };

  const isFit = (lot: ParkingLot) => {
    // Height check
    const limit = getHeightLimit(lot);
    if (limit && vehicle.height > limit) return false;

    // Type specific checks
    if (vehicle.type === VehicleType.HEAVY_BIKE) {
      const text = (lot.summary + lot.payex + (lot as any).introduction).toLowerCase();
      // "大型重型機車禁止進入" or similar
      if (text.includes('不開放小型車以外') || text.includes('禁止大型重型機車') || text.includes('不提供大型重型機車')) {
        return false;
      }
    }

    if (vehicle.type === VehicleType.MOTORBIKE) {
      if (lot.totalmotor === 0) return false;
    }

    return true;
  };

  const getAvailableSpots = (lot: ParkingLot) => {
    if (vehicle.type === VehicleType.MOTORBIKE) {
      return lot.availablemotor;
    }
    // Heavy bikes and Cars use Car spots
    return lot.availablecar;
  };

  const getTotalSpots = (lot: ParkingLot) => {
    if (vehicle.type === VehicleType.MOTORBIKE) {
      return lot.totalmotor;
    }
    return lot.totalcar;
  };

  if (!hasValidKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="mb-6 inline-flex p-4 bg-blue-100 rounded-2xl">
            <MapPin className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">需要 Google Maps API Key</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            為了提供地圖與導航服務，我們需要一個有效的 Google Maps Platform API 密鑰。
          </p>
          
          <div className="text-left space-y-4 mb-8">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-bold">1</span>
              <p className="text-sm text-slate-700">前往 <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-blue-600 font-medium hover:underline">Google Cloud Console</a> 取得金鑰。</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-bold">2</span>
              <p className="text-sm text-slate-700">在 AI Studio 的 <strong>Settings</strong> (右上角齒輪) → <strong>Secrets</strong> 中設定。</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-bold">3</span>
              <p className="text-sm text-slate-700">名稱設為 <code>GOOGLE_MAPS_PLATFORM_KEY</code>。</p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 italic border border-slate-100">
            設定完成後，應用程式會自動重新編譯並載入地圖。
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
          <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              className="w-96 h-full flex flex-col bg-white border-r border-slate-200 z-30 shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight text-slate-800">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Car className="text-white w-5 h-5" />
                    </div>
                    <span>ParkEasy 智慧停</span>
                  </h1>
                  <button 
                    onClick={() => setShowVehicleSettings(true)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    title="車輛設定"
                  >
                    <Settings className="h-5 w-5 text-slate-500" />
                  </button>
                </div>

                {/* Vehicle Quick Info */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 group cursor-pointer hover:border-blue-200 transition-colors" onClick={() => setShowVehicleSettings(true)}>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 flex justify-between">
                    <span>我的車型資訊</span>
                    <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">更改</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-black text-slate-700">
                      {vehicle.type === VehicleType.CAR && '一般小客車'}
                      {vehicle.type === VehicleType.HEAVY_BIKE && '大型重型機車'}
                      {vehicle.type === VehicleType.MOTORBIKE && '普通機車'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">車高限制</div>
                      <div className="text-sm font-black text-slate-800">{vehicle.height}m</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-sm">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">車寬限制</div>
                      <div className="text-sm font-black text-slate-800">{vehicle.width}m</div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="搜尋目的地或停車場..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none shadow-inner"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar bg-slate-50/50">
                <div className="px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  附近的停車建議 ({filteredLots.length})
                </div>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white border border-slate-100 h-32 rounded-2xl" />
                  ))
                ) : filteredLots.length > 0 ? (
                  filteredLots.slice(0, 50).map((lot) => (
                    <ParkingCard 
                      key={lot.id} 
                      lot={lot} 
                      onSelect={() => setSelectedLot(lot)} 
                      isSelected={selectedLot?.id === lot.id}
                      isFit={isFit(lot)}
                      availableSpots={getAvailableSpots(lot)}
                      totalSpots={getTotalSpots(lot)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Info className="mx-auto mb-2 opacity-20 w-12 h-12" />
                    <p>找不到符合的停車場</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-white">
                 <p className="text-[10px] text-slate-400 text-center font-medium">數據來源：台北市政府公有停車場即時資訊 API</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content (Map) */}
        <div className="flex-1 relative">
          <Map
            defaultCenter={{ lat: 25.0330, lng: 121.5654 }} // Taipei 101 center
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
            onClick={() => setSelectedLot(null)}
          >
            {parkingLots.slice(0, 100).map((lot) => {
              let lat = parseFloat((lot as any).lat);
              let lng = parseFloat((lot as any).lng);
              
              if (!lat || !lng) {
                const tw97x = parseFloat(lot.tw97x);
                const tw97y = parseFloat(lot.tw97y);
                if (tw97x && tw97y) {
                  const wgs84 = twd97_to_wgs84(tw97x, tw97y);
                  lat = wgs84.lat;
                  lng = wgs84.lng;
                }
              }
              
              if (!lat || !lng) return null;

              const fit = isFit(lot);
              const available = getAvailableSpots(lot);
              const hasSpots = available > 0;

              return (
                <ParkingMarker 
                  key={lot.id} 
                  lot={lot} 
                  lat={lat} 
                  lng={lng} 
                  isSelected={selectedLot?.id === lot.id}
                  onClick={() => setSelectedLot(lot)}
                  isFit={fit}
                  hasSpots={hasSpots}
                  availableSpots={available}
                />
              );
            })}
          </Map>

          {/* Toggle Sidebar Button */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`absolute top-4 ${sidebarOpen ? 'left-[394px]' : 'left-4'} bg-white p-2.5 rounded-xl shadow-xl border border-slate-200 z-40 transition-all duration-300 hover:text-blue-600`}
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
          </button>

          {/* Lot Detail Overlay */}
          <AnimatePresence>
            {selectedLot && (
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-40"
              >
                <div className="bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-6 border border-slate-200 flex flex-col md:flex-row gap-8 relative overflow-hidden">
                  {!isFit(selectedLot) && (
                    <div className="absolute top-0 right-0 p-1 px-4 bg-red-600 text-white text-[10px] uppercase font-black tracking-widest rounded-bl-2xl shadow-lg">
                      高度不符
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">停車場詳情</div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{selectedLot.name}</h2>
                      </div>
                      <div className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-sm ${getAvailableSpots(selectedLot) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {getAvailableSpots(selectedLot) > 0 ? `剩餘 ${getAvailableSpots(selectedLot)} 位` : '目前滿位'}
                      </div>
                    </div>
                    
                    <p className="text-slate-500 text-sm mb-6 flex items-center gap-2 font-medium">
                      <MapPin className="w-4 h-4 text-slate-400" /> {selectedLot.address}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                           <DollarSign className="w-3 h-3 text-blue-600" />
                           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">費率資訊</p>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-snug line-clamp-2">{selectedLot.payex || '請依現場公告為準'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                           <Clock className="w-3 h-3 text-blue-600" />
                           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">營業時間</p>
                        </div>
                        <p className="text-sm font-bold text-slate-700">{selectedLot.serviceTime || '24小時營業'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${(() => {
                          let lat = parseFloat((selectedLot as any).lat);
                          let lng = parseFloat((selectedLot as any).lng);
                          if (!lat || !lng) {
                            const wgs84 = twd97_to_wgs84(parseFloat(selectedLot.tw97x), parseFloat(selectedLot.tw97y));
                            lat = wgs84.lat;
                            lng = wgs84.lng;
                          }
                          return `${lat},${lng}`;
                        })()}`}
                        target="_blank"
                        rel="noopener"
                        className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                      >
                        <Navigation className="w-4 h-4" /> 開始導航
                      </a>
                      <button 
                         onClick={() => setSelectedLot(null)}
                         className="px-6 py-4 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal: Vehicle Settings */}
        <AnimatePresence>
          {showVehicleSettings && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
               onClick={() => setShowVehicleSettings(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8 overflow-hidden relative"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-orange-100 rounded-2xl">
                    <Car className="text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">車輛規格設定</h3>
                    <p className="text-gray-500 text-xs">設定後將為您篩選適合的停車場</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">車種類型</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: VehicleType.CAR, label: '一般小客車' },
                        { type: VehicleType.HEAVY_BIKE, label: '大型重機' },
                        { type: VehicleType.MOTORBIKE, label: '普通機車' },
                      ].map((item) => (
                        <button
                          key={item.type}
                          onClick={() => setVehicle({ ...vehicle, type: item.type })}
                          className={`py-3 px-2 rounded-xl text-[10px] font-black border-2 transition-all ${
                            vehicle.type === item.type 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">車寬 (公尺) - 影響進出難度</label>
                    <div className="flex items-center gap-5">
                      <input 
                        type="range" min="1.5" max="2.5" step="0.1" 
                        value={vehicle.width} 
                        onChange={e => setVehicle({ ...vehicle, width: parseFloat(e.target.value) })}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="w-14 text-right font-mono font-black text-xl text-slate-800">{vehicle.width}m</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-widest">車高 (公尺) - 關鍵通行限制</label>
                    <div className="flex items-center gap-5">
                      <input 
                        type="range" min="1.0" max="3.5" step="0.1" 
                        value={vehicle.height} 
                        onChange={e => setVehicle({ ...vehicle, height: parseFloat(e.target.value) })}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="w-14 text-right font-mono font-black text-xl text-slate-800">{vehicle.height}m</span>
                    </div>
                  </div>
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      我們將根據您的車高與 API 中的限高資訊進行比對。若目的地限高低於您的設定值，系統會發出警告標示。
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowVehicleSettings(false)}
                  className="w-full mt-10 bg-slate-900 text-white p-4 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-2xl active:scale-[0.98]"
                >
                  儲存車輛參數
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </APIProvider>
  );
}

function ParkingCard({ lot, onSelect, isSelected, isFit, availableSpots, totalSpots }: { lot: ParkingLot, onSelect: () => void, isSelected: boolean, isFit: boolean, availableSpots: number, totalSpots: number }) {
  const hasSpots = availableSpots > 0;
  
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 relative overflow-hidden ${
        isSelected 
        ? 'bg-blue-50/40 border-blue-500 shadow-xl z-10' 
        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg'
      } ${!isFit ? 'grayscale opacity-75' : ''}`}
    >
      <div className="flex justify-between items-start gap-3 mb-2">
        <h3 className={`font-black text-sm tracking-tight line-clamp-1 flex-1 ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
          {lot.name}
        </h3>
        {!isFit && (
          <span className="bg-red-100 text-red-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-red-200">
            不符
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400 mb-4 truncate font-medium">{lot.address}</p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">剩餘</span>
            <span className={`text-xl font-mono font-black ${hasSpots ? 'text-blue-600' : 'text-red-500'}`}>
              {availableSpots >= 0 ? availableSpots : 0}
            </span>
          </div>
          <div className="h-8 w-[1.5px] bg-slate-100 rounded-full" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">總位</span>
            <span className="text-xl font-mono font-black text-slate-300">{totalSpots}</span>
          </div>
        </div>
        
        {isSelected ? (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
            選取中
          </button>
        ) : (
          <div className="flex flex-col items-end">
             <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">費率</span>
             <span className="text-xs font-black text-slate-700">
               {lot.payex?.match(/\$[0-9]+/)?.[0] || '現場測'}
             </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ParkingMarker({ lot, lat, lng, isSelected, onClick, isFit, hasSpots, availableSpots }: { lot: ParkingLot, lat: number, lng: number, isSelected: boolean, onClick: () => void, isFit: boolean, hasSpots: boolean, availableSpots: number }) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat, lng }}
      onClick={onClick}
      zIndex={isSelected ? 1000 : 0}
    >
      <div className={`relative transition-all duration-500 ${isSelected ? 'scale-125' : 'scale-100'}`}>
        {!isFit && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white shadow-xl" />
          </div>
        )}
        <div className={`px-2 py-1 rounded-lg border-2 flex items-center justify-center font-mono font-black text-[11px] shadow-[0_10px_20px_rgba(0,0,0,0.15)] transition-all ${
          isSelected 
            ? 'bg-slate-900 border-white text-white translate-y-[-6px]' 
            : !isFit
              ? 'bg-slate-100 border-slate-300 text-slate-400 grayscale'
              : hasSpots
                ? 'bg-blue-600 border-white text-white'
                : 'bg-red-500 border-white text-white'
        }`}>
          {availableSpots >= 0 ? availableSpots : 'P'}
          {!isSelected && (
             <div className="absolute bottom-[-10px] left-1/2 translate-x-[-50%] border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-inherit drop-shadow-sm" />
          )}
        </div>
      </div>
    </AdvancedMarker>
  );
}
