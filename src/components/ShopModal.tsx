import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShoppingBag,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  Trophy,
  Zap,
  Info,
  DollarSign,
  ShieldCheck,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  ShopItem,
  SHOP_SKINS,
  SHOP_ARENAS,
  SHOP_ATTRIBUTES,
  DIAMOND_BUNDLES,
  DiamondBundle,
} from '../utils/shop';
import { PlayerProfile } from '../lib/supabase';
import { audio } from '../utils/audio';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PlayerProfile | null;
  diamonds: number;
  onUpdateDiamonds: (newDiamonds: number) => void;
  purchasedSkins: string[];
  onAddPurchasedSkin: (skinId: string) => void;
  purchasedArenas: string[];
  onAddPurchasedArena: (arenaId: string) => void;
  purchasedAttributes: string[];
  onAddPurchasedAttribute: (attrId: string) => void;
  equippedArena: string;
  onEquipArena: (arenaId: string) => void;
  equippedAttribute: string;
  onEquipAttribute: (attrId: string) => void;
  onSelectSkin: (skinId: string) => void;
  selectedSkinId: string;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  diamonds,
  onUpdateDiamonds,
  purchasedSkins,
  onAddPurchasedSkin,
  purchasedArenas,
  onAddPurchasedArena,
  purchasedAttributes,
  onAddPurchasedAttribute,
  equippedArena,
  onEquipArena,
  equippedAttribute,
  onEquipAttribute,
  onSelectSkin,
  selectedSkinId,
}) => {
  const [activeTab, setActiveTab] = useState<'topup' | 'skins' | 'arenas' | 'attributes' | 'gateway_guide'>('topup');
  const [checkoutItem, setCheckoutItem] = useState<{
    title: string;
    priceIdr: number;
    type: 'bundle' | 'item';
    itemRef?: ShopItem | DiamondBundle;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va' | 'card'>('qris');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  if (!isOpen) return null;

  const handleBuyWithDiamonds = async (item: ShopItem) => {
    if (!item.diamondPrice) return;
    audio.playClick();

    if (diamonds < item.diamondPrice) {
      alert(`Diamond Anda tidak cukup! Diperlukan ${item.diamondPrice} 💎.`);
      return;
    }

    const newBalance = diamonds - item.diamondPrice;
    onUpdateDiamonds(newBalance);

    if (item.category === 'skin') {
      onAddPurchasedSkin(item.id);
      onSelectSkin(item.id);
    } else if (item.category === 'arena') {
      onAddPurchasedArena(item.id);
      onEquipArena(item.id);
    } else if (item.category === 'attribute') {
      onAddPurchasedAttribute(item.id);
      onEquipAttribute(item.id);
    }

    // Save purchase state locally
    try {
      localStorage.setItem('mb_diamonds', newBalance.toString());
      if (item.category === 'skin') {
        const skins = JSON.parse(localStorage.getItem('mb_purchased_skins') || '[]');
        if (!skins.includes(item.id)) skins.push(item.id);
        localStorage.setItem('mb_purchased_skins', JSON.stringify(skins));
      }
    } catch (err) {
      console.warn('Error saving purchase state:', err);
    }

    audio.playBell();
    alert(`Berhasil membeli ${item.name}! Item langsung terpasang.`);
  };

  const handleStartCheckout = (title: string, priceIdr: number, itemRef: ShopItem | DiamondBundle, type: 'bundle' | 'item') => {
    audio.playClick();
    setCheckoutItem({ title, priceIdr, type, itemRef });
    setPaymentStatus('idle');
  };

  const handleSimulatePaymentSuccess = async () => {
    if (!checkoutItem) return;

    setPaymentStatus('processing');
    audio.playClick();

    setTimeout(async () => {
      setPaymentStatus('success');
      audio.playBell();

      const { itemRef, type } = checkoutItem;

      if (type === 'bundle' && 'diamonds' in itemRef!) {
        const bundle = itemRef as DiamondBundle;
        const totalAwarded = bundle.diamonds + bundle.bonus;
        const newTotal = diamonds + totalAwarded;
        onUpdateDiamonds(newTotal);

        try {
          localStorage.setItem('mb_diamonds', newTotal.toString());
        } catch (err) {
          console.warn('Error saving diamonds:', err);
        }
      } else if (type === 'item' && 'category' in itemRef!) {
        const shopItem = itemRef as ShopItem;
        if (shopItem.category === 'skin') {
          onAddPurchasedSkin(shopItem.id);
          onSelectSkin(shopItem.id);
        } else if (shopItem.category === 'arena') {
          onAddPurchasedArena(shopItem.id);
          onEquipArena(shopItem.id);
        } else if (shopItem.category === 'attribute') {
          onAddPurchasedAttribute(shopItem.id);
          onEquipAttribute(shopItem.id);
        }

        try {
          if (shopItem.category === 'skin') {
            const skins = JSON.parse(localStorage.getItem('mb_purchased_skins') || '[]');
            if (!skins.includes(shopItem.id)) skins.push(shopItem.id);
            localStorage.setItem('mb_purchased_skins', JSON.stringify(skins));
          }
        } catch (err) {
          console.warn('Error saving item purchase:', err);
        }
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-white flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl text-slate-950 shadow-md">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-arcade text-lg sm:text-2xl font-bold text-amber-400 tracking-wide">
                  TOKO & MICROTRANSACTION
                </h2>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  OFFICIAL STORE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Beli Costume, Ring Arena, Attribut & Top-Up Diamond
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Diamond Balance */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-cyan-500/40 rounded-2xl text-cyan-400 font-arcade font-bold text-sm shadow">
              <span className="text-base">💎</span>
              <span>{diamonds}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                audio.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-3 border-b border-slate-800 scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setActiveTab('topup');
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'topup'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            TOP-UP DIAMOND
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setActiveTab('skins');
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'skins'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-4 h-4" />
            SKIN PREMIUM
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setActiveTab('arenas');
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'arenas'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-4 h-4" />
            RING ARENA
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setActiveTab('attributes');
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'attributes'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            ATTRIBUT & BOOST
          </button>

          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setActiveTab('gateway_guide');
            }}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'gateway_guide'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            CARA TERIMA UANG (GUIDE)
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* TAB 1: TOP UP DIAMONDS */}
          {activeTab === 'topup' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-amber-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-amber-300">Isi Uang Diamond Game</h3>
                  <p className="text-xs text-slate-400">
                    Gunakan Diamond untuk membeli kostum, arena, dan atribut eksklusif tanpa batasan score.
                  </p>
                </div>
                <span className="text-2xl">💎</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {DIAMOND_BUNDLES.map((bundle) => (
                  <div
                    key={bundle.id}
                    className="relative bg-slate-950/90 border border-slate-800 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between transition group hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  >
                    {bundle.badge && (
                      <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-2 py-0.5 rounded-full shadow">
                        {bundle.badge}
                      </span>
                    )}

                    <div className="text-center space-y-2">
                      <div className="text-3xl py-2">{bundle.icon}</div>
                      <h4 className="font-arcade font-bold text-lg text-white">
                        {bundle.diamonds} 💎
                      </h4>
                      {bundle.bonus > 0 && (
                        <p className="text-xs font-bold text-emerald-400">
                          +{bundle.bonus} Bonus Diamond!
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleStartCheckout(
                            `${bundle.diamonds + bundle.bonus} Diamond Bundle`,
                            bundle.idrPrice,
                            bundle,
                            'bundle'
                          )
                        }
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <CreditCard className="w-4 h-4" />
                        Rp {bundle.idrPrice.toLocaleString('id-ID')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SKINS PREMIUM */}
          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_SKINS.map((item) => {
                const isPurchased = purchasedSkins.includes(item.id);
                const isEquipped = selectedSkinId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl flex gap-3 items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-snug mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1.5">
                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terpakai
                        </span>
                      ) : isPurchased ? (
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            onSelectSkin(item.id);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition"
                        >
                          Pakai Skin
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleBuyWithDiamonds(item)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                          >
                            <span>💎</span> {item.diamondPrice}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStartCheckout(
                                item.name,
                                item.idrPrice || 15000,
                                item,
                                'item'
                              )
                            }
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold text-[11px] rounded-xl transition"
                          >
                            Rp {(item.idrPrice || 15000).toLocaleString('id-ID')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: RING ARENAS */}
          {activeTab === 'arenas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_ARENAS.map((item) => {
                const isPurchased = purchasedArenas.includes(item.id);
                const isEquipped = equippedArena === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl flex gap-3 items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-snug mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1.5">
                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terpakai
                        </span>
                      ) : isPurchased ? (
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            onEquipArena(item.id);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition"
                        >
                          Pakai Arena
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleBuyWithDiamonds(item)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                          >
                            <span>💎</span> {item.diamondPrice}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStartCheckout(
                                item.name,
                                item.idrPrice || 10000,
                                item,
                                'item'
                              )
                            }
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold text-[11px] rounded-xl transition"
                          >
                            Rp {(item.idrPrice || 10000).toLocaleString('id-ID')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: ATTRIBUTES & BOOST */}
          {activeTab === 'attributes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHOP_ATTRIBUTES.map((item) => {
                const isPurchased = purchasedAttributes.includes(item.id);
                const isEquipped = equippedAttribute === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl flex gap-3 items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{item.name}</h4>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-snug mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right space-y-1.5">
                      {isEquipped ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terpakai
                        </span>
                      ) : isPurchased ? (
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            onEquipAttribute(item.id);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 transition"
                        >
                          Pasang Boost
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleBuyWithDiamonds(item)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                          >
                            <span>💎</span> {item.diamondPrice}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStartCheckout(
                                item.name,
                                item.idrPrice || 12000,
                                item,
                                'item'
                              )
                            }
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-bold text-[11px] rounded-xl transition"
                          >
                            Rp {(item.idrPrice || 12000).toLocaleString('id-ID')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: DEVELOPER PAYMENT GATEWAY GUIDE */}
          {activeTab === 'gateway_guide' && (
            <div className="p-5 bg-slate-950/90 border border-emerald-500/40 rounded-2xl space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-arcade text-lg font-bold text-emerald-400">
                    BAGAIMANA CARA ANDA MENERIMA UANG PEMBAYARAN?
                  </h3>
                  <p className="text-slate-300">
                    Panduan integrasi Payment Gateway resmi untuk menerima uang asli dari pemain ke rekening bank Anda.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-slate-300">
                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> 1. Layanan Payment Gateway Terpopuler di Indonesia:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                    <li>
                      <strong className="text-white">Midtrans / Xendit</strong> (Mendukung QRIS, GoPay, ShopeePay, Dana, OVO, Virtual Account BCA/Mandiri/BRI, & Kartu Kredit).
                    </li>
                    <li>
                      <strong className="text-white">Stripe</strong> (Mendukung transaksi internasional dengan Kartu Kredit / Debit).
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> 2. Alur Pencairan Uang Masuk Ke Rekening Anda:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                    <li>Pemain memilih paket top-up / item di game dan melakukan pembayaran (misal via QRIS / GoPay).</li>
                    <li>Payment Gateway (Midtrans/Xendit) memverifikasi pembayaran secara otomatis melalui Webhook API.</li>
                    <li>
                      Uang hasil penjualan tersimpan di dashboard Midtrans/Xendit Anda dan otomatis ditarik (pencairan H+1) langsung ke <strong className="text-emerald-400">Rekening Bank Anda</strong>.
                    </li>
                  </ol>
                </div>

                <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> 3. Langkah Konfigurasi Variabel Environment:
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Daftarkan akun di dashboard Midtrans (midtrans.com) atau Stripe (stripe.com), lalu masukkan API Keys Anda ke dalam file <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-300">.env.example</code>:
                  </p>
                  <pre className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto">
{`MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
STRIPE_SECRET_KEY=sk_test_xxxx`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CHECKOUT SIMULATION MODAL */}
        {checkoutItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-white space-y-5">
              
              <button
                type="button"
                onClick={() => setCheckoutItem(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2.5 py-1 rounded-full border border-amber-500/40">
                  PEMBAYARAN GATEWAY AMAN
                </span>
                <h3 className="font-arcade text-xl font-bold text-white mt-1">
                  {checkoutItem.title}
                </h3>
                <p className="font-arcade text-2xl font-bold text-amber-400">
                  Rp {checkoutItem.priceIdr.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Pilih Metode Pembayaran:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'qris'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>QRIS / E-Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('va')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'va'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Virtual Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      paymentMethod === 'card'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>Kartu Kredit</span>
                  </button>
                </div>
              </div>

              {/* Display QR / Detail */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
                {paymentMethod === 'qris' && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-slate-300 inline-block">
                      {/* Realistic Simulated QR Code */}
                      <div className="w-36 h-36 bg-slate-900 p-2 rounded-lg flex flex-col items-center justify-center text-amber-400 font-mono text-[10px] leading-tight text-center">
                        <QrCode className="w-24 h-24 text-white" />
                        <span>MATHBOXING-QRIS</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Scan dengan GoPay, OVO, Dana, ShopeePay, BCA Mobile, atau Bank Apapun
                    </p>
                  </div>
                )}

                {paymentMethod === 'va' && (
                  <div className="text-left space-y-2">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400">BCA Virtual Account:</span>
                      <code className="font-mono text-amber-300 font-bold">88001293847291</code>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-400">Mandiri VA:</span>
                      <code className="font-mono text-amber-300 font-bold">89301293847291</code>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="text-left space-y-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nomor Kartu (4542 xxxx xxxx xxxx)"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-amber-400 text-white font-mono"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-amber-400 text-white font-mono"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl outline-none focus:border-amber-400 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {paymentStatus === 'success' ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 font-bold text-center text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 animate-bounce" />
                  Pembayaran Berhasil! Item telah diisi.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={paymentStatus === 'processing'}
                  onClick={handleSimulatePaymentSuccess}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm rounded-2xl transition active:scale-95 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentStatus === 'processing' ? (
                    'Memproses Transaksi...'
                  ) : (
                    <>
                      <span>Selesaikan Pembayaran Simulasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
