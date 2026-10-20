"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowRight, Backpack, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Coins, Compass, Crosshair, Dna, Eye, Flame, Gem, Heart, History, Leaf, LoaderCircle, LogOut, Maximize, Menu, Mountain, Plus, Radio, Shield, Sparkles, Swords, Timer, TrendingUp, X, Zap } from "lucide-react";
import BattleScene from "@/components/BattleScene";
import CreatureArt from "@/components/CreatureArt";
import type { GameAction, GameSnapshot, Gear } from "@/lib/types";

type View = "expedition" | "creature" | "inventory" | "journal";
type Dialog = "auth" | "evolve" | "help" | "offline" | "settings" | null;
const number = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
const duration = (seconds: number) => seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}min` : `${Math.max(1, Math.floor(seconds / 60))}min`;
const navItems: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "expedition", label: "Expedição", icon: Compass },
  { id: "creature", label: "Criatura", icon: Eye },
  { id: "inventory", label: "Inventário", icon: Backpack },
  { id: "journal", label: "Registros", icon: BookOpen },
];

export default function Home() {
  const [game, setGame] = useState<GameSnapshot | null>(null);
  const [view, setView] = useState<View>("expedition");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [connection, setConnection] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authError, setAuthError] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const gameRef = useRef<GameSnapshot | null>(null);
  const bootRef = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const acting = useRef(false);
  const requestGeneration = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const offlineShown = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const notify = useCallback((message: string) => setToast(message), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const invalidateLoads = useCallback(() => {
    requestGeneration.current++;
    loadController.current?.abort();
    loadController.current = null;
  }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 4500); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { setReducedMotion(localStorage.getItem("ruptura-reduced-motion") === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  useEffect(() => { const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", onChange); return () => document.removeEventListener("fullscreenchange", onChange); }, []);

  const acceptGame = useCallback((snapshot: GameSnapshot) => {
    gameRef.current = snapshot;
    setGame(snapshot);
    setConnection(true);
    if (snapshot.offline && !offlineShown.current) { offlineShown.current = true; setDialog("offline"); }
  }, []);

  const load = useCallback(async (autoGuest = false) => {
    if (loadController.current) return;
    const controller = new AbortController();
    loadController.current = controller;
    const generation = requestGeneration.current;
    const options = { signal: controller.signal, cache: "no-store" as const };
    try {
      let response = await fetch("/api/game", options);
      if (response.status === 401 && autoGuest) {
        const guest = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "guest" }), signal: controller.signal });
        if (!guest.ok) throw new Error((await guest.json()).error || "Não foi possível iniciar sua jornada.");
        response = await fetch("/api/game", options);
      }
      if (generation !== requestGeneration.current) return;
      if (response.status === 401) { setGame(null); gameRef.current = null; setAuthMode("login"); setDialog("auth"); return; }
      const data = await response.json();
      if (generation !== requestGeneration.current) return;
      if (!response.ok) throw new Error(data.error || "O mundo está inacessível. Tente novamente.");
      acceptGame(data);
    } catch (error) { if (controller.signal.aborted) return; setConnection(false); if (!gameRef.current) notify(error instanceof Error ? error.message : "Falha de conexão."); }
    finally { if (loadController.current === controller) { loadController.current = null; setBooting(false); } }
  }, [acceptGame, notify]);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    void load(true);
  }, [load]);
  useEffect(() => {
    if (!game) return;
    const id = setInterval(() => { if (!acting.current && document.visibilityState === "visible") void load(); }, 3000);
    const wake = () => { if (document.visibilityState === "visible" && !acting.current) { offlineShown.current = false; void load(); } };
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", wake); };
  }, [Boolean(game), load]); // Polling survives state refreshes.

  const act = async (action: GameAction, success: string) => {
    if (acting.current) return;
    invalidateLoads();
    acting.current = true; setBusy(true);
    try {
      const response = await fetch("/api/game/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir.");
      acceptGame(data); notify(success);
      if (action.action === "evolve" || action.action === "claimOffline") setDialog(null);
    } catch (error) { notify(error instanceof Error ? error.message : "Falha de conexão."); }
    finally { acting.current = false; setBusy(false); }
  };

  const authenticate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (acting.current) return; invalidateLoads(); setAuthError(""); setBusy(true); acting.current = true;
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: authMode, name: fields.get("name"), email: fields.get("email"), password: fields.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDialog(null); offlineShown.current = false; await load(); notify(authMode === "register" ? "Sua jornada agora tem um lar. Conta criada!" : "Bom ter você de volta, viajante.");
    } catch (error) { setAuthError(error instanceof Error ? error.message : "Não foi possível entrar."); }
    finally { setBusy(false); acting.current = false; }
  };

  const logout = async () => {
    if (acting.current) return;
    invalidateLoads();
    setBusy(true); acting.current = true;
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
      if (!response.ok) throw new Error("Não foi possível sair.");
      setGame(null); gameRef.current = null; setAuthMode("login"); setDialog("auth");
    } catch { notify("Não foi possível sair. Tente novamente."); }
    finally { setBusy(false); acting.current = false; }
  };

  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await sceneRef.current?.requestFullscreen(); }
    catch { notify("Tela cheia indisponível neste navegador."); }
  };
  const navigate = (next: View) => { setView(next); setMenu(false); };
  const c = game?.character;

  return <div className="app-shell">
    {menu && <button className="sidebar-scrim" aria-label="Fechar menu" onClick={() => setMenu(false)}/>}
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <a className="brand" href="/" aria-label="Ruptura — início"><span className="brand-symbol">ϟ</span><span>RUPTURA<small>ECOS DO IMPOSSÍVEL</small></span></a>
      <div className="realm-label"><span className="status-dot"/> MUNDO FRAGMENTADO <span className="realm-version">01</span></div>
      <div className="nav-section-label">SUA JORNADA</div>
      <nav aria-label="Navegação principal">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "selected" : ""}`} onClick={() => navigate(id)}><Icon size={19}/><span>{label}</span>{id === "creature" && <span className="nav-count">01</span>}{id === "inventory" && game && <span className="nav-count">{game.inventory.length.toString().padStart(2, "0")}</span>}{view === id && <span className="active-dot"/>}</button>)}</nav>
      <div className="sidebar-world"><div className="world-art"><Mountain size={48} strokeWidth={.7}/><span className="world-orbit"/></div><span className="eyebrow">O PRIMEIRO FRAGMENTO</span><h3>Nem tudo que se perdeu<br/>deveria ser encontrado.</h3><p>Sua história começa depois do fim.</p><button onClick={() => setDialog("help")}>Conheça a Ruptura <ArrowRight size={14}/></button></div>
      <div className="sidebar-bottom"><button className="guide-button" onClick={() => setDialog("help")}><CircleHelp size={17}/> Guia do viajante <ArrowRight size={15}/></button><div className="server-label"><span className={`status-dot ${!connection ? "disconnected" : ""}`}/>{connection ? "Conectado ao mundo" : "Reconectando…"}<span>v0.1</span></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu size={21}/></button><span>O SEU MUNDO</span><ChevronRight size={13}/><strong>{navItems.find(n => n.id === view)?.label}</strong></div><div className="topbar-right"><div className="currency gold" title="Gold — melhorias e equipamentos"><Coins size={18}/><span>{number(game?.player.gold ?? 0)}</span></div><div className="currency gems" title="Gemas — conquistadas ao derrotar bosses"><Gem size={17}/><span>{number(game?.player.gems ?? 0)}</span></div><span className="topbar-divider"/><button className="user-button" onClick={() => { setAuthError(""); setDialog(game?.player.isGuest || !game ? "auth" : "settings"); }}><span className="avatar"><Eye size={18}/></span><span>{game?.player.name || "Viajante"}<small>{game?.player.isGuest ? "VIAJANTE SEM VÍNCULO" : "CONTA CONECTADA"}</small></span><ChevronDown size={14}/></button></div></header>

      <main>
        <div className="page-heading"><div><div className="eyebrow"><span/> ALÉM DO QUE ERA POSSÍVEL</div><h1>{view === "expedition" ? "A jornada continua" : view === "creature" ? "Um vínculo improvável" : view === "inventory" ? "Fragmentos da jornada" : "Toda criatura tem uma história"}<span>.</span></h1><p>{view === "expedition" ? "O mundo não espera. Sua criatura também não." : view === "creature" ? "Cuide do que encontrou. Descubra o que pode se tornar." : view === "inventory" ? "O que o mundo deixou para trás pode mudar o seu destino." : "As marcas que você deixou em um mundo que se refaz."}</p></div><div className="live-label"><span className="status-dot"/> {connection ? "PROGRESSÃO AUTOMÁTICA" : "SINCRONIZANDO"}</div></div>

        {!game ? <div className="loading-world"><span className="loading-symbol">ϟ</span><h2>{booting ? "Reunindo os fragmentos…" : "Sua história espera por você."}</h2><p>{booting ? "Preparando uma criatura que ainda não sabe que é sua." : "Entre ou explore o primeiro fragmento."}</p>{!booting && <button className="primary-button" onClick={() => { setBooting(true); void load(true); }}>Entrar como visitante <ArrowRight size={16}/></button>}</div> : <>
          {view === "expedition" && <>
            <div className="expedition-grid">
              <section className="battle-card panel" ref={sceneRef}>
                <div className="battle-header"><div className="area-icon"><Leaf size={20}/></div><div><span className="eyebrow">REGIÃO {String(game.area.region).padStart(2, "0")} <span className="small-dot">·</span> PRIMEIRO FRAGMENTO</span><h2>{game.area.name}</h2></div><span className="stage-badge">FASE {String(game.area.stage).padStart(2, "0")}</span></div>
                <div className="battle-scene"><BattleScene phase={game.area.stage} heroHp={game.combat.characterHp} heroMaxHp={c!.stats.maxHp} enemyHp={game.combat.enemy.hp} enemyMaxHp={game.combat.enemy.maxHp} heroDamage={c!.stats.attack} enemyName={game.combat.enemy.name} boss={game.combat.enemy.isBoss} active={connection} reducedMotion={reducedMotion} area={game.area.region}/><div className="scene-vignette"/>
                  <div className="scene-top"><span className="auto-badge"><span className="status-dot"/> COMBATE AUTOMÁTICO</span><button onClick={() => setDialog("help")} className="scene-info" aria-label="Como funciona o combate"><CircleHelp size={17}/></button></div>
                  <div className="combat-label hero-label"><div><span>{c!.name}</span><span>Nv. {c!.level}</span></div><div className="health-track"><span style={{ width: `${100 * game.combat.characterHp / c!.stats.maxHp}%` }}/></div></div>
                  <div className="combat-label enemy-label"><div><span>{game.combat.enemy.name}</span>{game.combat.enemy.isBoss && <Flame size={13}/>}</div><div className="health-track enemy"><span style={{ width: `${100 * game.combat.enemy.hp / game.combat.enemy.maxHp}%` }}/></div></div>
                  <div className="scene-caption"><span><span className="status-dot"/> O impossível está vivo.</span><button className="icon-button" onClick={fullscreen} aria-label={isFullscreen ? "Sair de tela cheia" : "Expandir combate"}><Maximize size={16}/></button></div>
                </div>
                <div className="battle-footer"><div><Radio size={17}/><span>Sua criatura luta. Você decide o próximo passo.</span></div><span className="speed-tag">1× <span>VELOCIDADE</span></span></div>
              </section>
              <section className="creature-card panel"><div className="card-heading"><span className="eyebrow">SUA CRIATURA</span><button className="text-icon" onClick={() => navigate("creature")} aria-label="Ver detalhes da criatura"><ArrowRight size={17}/></button></div><div className="creature-portrait"><div className="portrait-orbit"/><CreatureArt evolved={c!.evolution}/><span className="level-stamp">{c!.level}<small>NV.</small></span><span className="portrait-spark spark-one"/><span className="portrait-spark spark-two"/></div><div className="creature-name"><span className="rarity"><span/> {c!.rarity.toUpperCase()} <span className="nature-divider">/</span> {c!.nature.toUpperCase()}</span><h2>{c!.name}</h2><p>{c!.title}</p></div><div className="xp-label"><span>Nível {c!.level}</span><span>{number(c!.xp)} <span>/ {number(c!.xpToNext)} XP</span></span></div><div className="xp-track"><span style={{ width: `${100 * c!.xp / c!.xpToNext}%` }}/></div><div className="creature-stats"><div><Swords size={15}/><strong>{c!.stats.attack}</strong><span>ATAQUE</span></div><div><Shield size={15}/><strong>{c!.stats.defense}</strong><span>DEFESA</span></div><div><Heart size={15}/><strong>{c!.stats.maxHp}</strong><span>VIDA</span></div></div><button className="primary-button train-button" disabled={busy || game.player.gold < game.costs.training} onClick={() => void act({ action: "train" }, "Criatura fortalecida. O mundo que se prepare.")}><span>{busy ? <LoaderCircle className="spin" size={16}/> : <TrendingUp size={16}/>} Fortalecer</span><span><Coins size={15}/>{number(game.costs.training)}</span></button><p className="card-hint">A força cresce. A essência permanece?</p></section>
            </div>

            <div className="below-grid"><section className="journey-card panel"><div className="section-heading"><h2><Compass size={17}/> Caminho da expedição</h2><span>FASE {game.area.stage} <span className="muted">/ BOSS {game.area.nextBossStage}</span></span></div><div className="stage-path">{Array.from({ length: 5 }, (_, i) => { const stage = Math.floor((game.area.stage - 1) / 5) * 5 + i + 1; return <div key={stage} className={`path-node ${stage < game.area.stage ? "completed" : stage === game.area.stage ? "current" : ""}`}><span>{i === 4 ? <Flame size={18}/> : stage < game.area.stage ? <Check size={16}/> : stage === game.area.stage ? <Crosshair size={17}/> : <span className="node-dot"/>}</span><small>{i === 4 ? "BOSS" : String(stage).padStart(2, "0")}</small></div>; })}</div><div className="stage-progress-row"><span>{game.combat.enemy.isBoss ? "O guardião do fragmento" : "Criaturas derrotadas nesta fase"}</span><strong>{game.combat.killsInStage} <span>/ {game.combat.killsRequired}</span></strong></div><div className="stage-track"><span style={{ width: `${100 * game.combat.killsInStage / game.combat.killsRequired}%` }}/></div></section>
              <section className="offline-card panel"><div className="section-heading"><h2><Timer size={17}/> Até na sua ausência</h2><span className="mini-badge">IDLE</span></div><div className="offline-value">8<span>horas</span><span className="offline-moon">☾</span></div><p>O mundo continua quando você sai.<br/>Sua próxima descoberta espera por você.</p><div className="offline-rates"><span><Coins size={14}/>{number(game.rates.goldPerMinute)} <small>Gold/min</small></span><span><Sparkles size={14}/>{number(game.rates.xpPerMinute)} <small>XP/min</small></span></div>{game.offline && <button className="offline-collect" onClick={() => setDialog("offline")}><ArrowDownToLine size={13}/> Coletar {number(game.offline.gold)} Gold <ArrowRight size={12}/></button>}</section></div>

            <section className="activity-panel"><div className="section-heading"><h2><History size={16}/> Ecos recentes <span className="history-dot"/></h2><button className="text-link" onClick={() => navigate("journal")}>Ver registros <ArrowRight size={14}/></button></div><div className="activity-feed">{game.history.slice(0, 3).map((entry) => <div className="activity-row" key={entry.id}><span className={`activity-icon ${entry.kind}`}>{entry.kind === "loot" ? <Backpack size={15}/> : entry.kind === "training" ? <TrendingUp size={15}/> : entry.kind === "evolution" ? <Dna size={15}/> : <Sparkles size={15}/>}</span><p>{entry.message}</p><time dateTime={entry.at}>{new Date(entry.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time></div>)}</div></section>
          </>}

          {view === "creature" && <div className="detail-grid"><section className="panel creature-detail"><span className="eyebrow">UM SER ÚNICO NO MUNDO</span><div className="detail-art"><CreatureArt evolved={c!.evolution}/></div><span className="rarity">{c!.rarity.toUpperCase()} · {c!.nature.toUpperCase()}</span><h2>{c!.name}</h2><p>{c!.title}</p><blockquote>“Ele não sabe de onde veio. Só sabe que ainda tem fome.”</blockquote><div className="identity-row"><span>Tempo de existência<strong>{duration(c!.ageSeconds)}</strong></span><span>Vínculos anteriores<strong>Nenhum</strong></span><span>Treinamento<strong>+{c!.trainingLevel}</strong></span></div></section><div className="detail-side"><section className="panel detail-panel"><div className="section-heading"><h2><TrendingUp size={18}/> Força além da forma</h2><span className="level-pill">NÍVEL {c!.level}</span></div><div className="stat-rows"><div><Swords size={17}/> Ataque <strong>{c!.stats.attack}</strong></div><div><Shield size={17}/> Defesa <strong>{c!.stats.defense}</strong></div><div><Heart size={17}/> Vida <strong>{c!.stats.maxHp}</strong></div><div><Zap size={17}/> Poder total <strong>{number(c!.stats.power)}</strong></div></div><p className="body-copy">A experiência aumenta seu nível automaticamente. Use Gold para fortalecer seus atributos.</p><button className="primary-button" disabled={busy || game.player.gold < game.costs.training} onClick={() => void act({ action: "train" }, "O Devorador ficou mais forte.")}><TrendingUp size={16}/> Fortalecer <span className="button-price"><Coins size={15}/>{game.costs.training}</span></button></section><section className="panel detail-panel evolution-panel"><span className="eyebrow"><Dna size={14}/> PRÓXIMA FORMA</span><h2>{c!.evolution ? c!.evolution === "organic" ? "Predador de raízes" : "Máquina profana" : "O que você vai se tornar?"}</h2><p>{c!.evolution ? "Sua escolha deixou uma marca permanente. A jornada da próxima forma está apenas começando." : "Carne ou metal. Dois caminhos. Uma escolha que transforma a criatura para sempre."}</p><button className="outline-button" onClick={() => setDialog("evolve")} disabled={Boolean(c!.evolution)}>{c!.evolution ? <Check size={16}/> : <Dna size={16}/>} {c!.evolution ? "Evolução concluída" : "Explorar evolução"}<ArrowRight size={15}/></button>{!c!.evolution && <small>Disponível no nível {game.costs.evolutionLevel} · {game.costs.evolution} Gold</small>}</section></div></div>}

          {view === "inventory" && <section className="panel inventory-panel"><div className="section-heading"><h2><Backpack size={19}/> Inventário <span className="mini-badge">{game.inventory.length} ITENS</span></h2><span className="muted">Encontrados durante a expedição</span></div><div className="equipment-slots">{(["weapon", "armor", "relic"] as const).map(slot => { const item = c!.equipment[slot]; const Icon = slot === "weapon" ? Swords : slot === "armor" ? Shield : Gem; return <div className={`equipment-slot ${item ? "has-item" : ""}`} key={slot}><div className="slot-art"><Icon size={25}/></div><div><small>{slot === "weapon" ? "ARMA" : slot === "armor" ? "PROTEÇÃO" : "RELÍQUIA"}</small><h3>{item?.name || "Espaço vazio"}</h3><p>{item ? `+${item.attack} ATQ · +${item.defense} DEF · +${item.health} HP` : "Encontre equipamentos em combate"}</p></div></div>; })}</div><div className="filter-tabs" aria-label="Filtrar equipamentos">{[["all", "Todos"], ["weapon", "Armas"], ["armor", "Proteções"], ["relic", "Relíquias"]].map(([id, label]) => <button key={id} className={inventoryFilter === id ? "active" : ""} onClick={() => setInventoryFilter(id)}>{label}</button>)}</div><div className="item-grid">{game.inventory.filter(item => inventoryFilter === "all" || item.slot === inventoryFilter).map(item => <ItemCard item={item} key={item.id} equipped={c!.equipment[item.slot]?.id === item.id} busy={busy} onEquip={() => void act({ action: "equip", itemId: item.id }, `${item.name} equipado.`)}/>)}{game.inventory.filter(item => inventoryFilter === "all" || item.slot === inventoryFilter).length === 0 && <div className="empty-inventory"><Backpack size={32}/><h3>Há descobertas pelo caminho.</h3><p>Continue a expedição. Criaturas e bosses deixam equipamentos ao serem derrotados.</p><button className="text-link" onClick={() => navigate("expedition")}>Voltar à expedição <ArrowRight size={15}/></button></div>}</div></section>}

          {view === "journal" && <section className="panel journal-panel"><div className="section-heading"><h2><BookOpen size={18}/> Memórias de um fragmento</h2><span className="mini-badge">{number(game.area.totalKills)} DERROTADOS</span></div><p className="body-copy">Treinos, descobertas e transformações. Os últimos ecos da sua jornada.</p><div className="journal-list">{game.history.map(entry => <div className="journal-entry" key={entry.id}><span className="journal-icon">{entry.kind === "evolution" ? <Dna size={18}/> : entry.kind === "loot" ? <Backpack size={18}/> : entry.kind === "training" ? <TrendingUp size={18}/> : <Sparkles size={18}/>}</span><div><span className="eyebrow">{({ milestone: "A JORNADA AVANÇA", loot: "NOVA DESCOBERTA", evolution: "UMA NOVA FORMA", training: "FORÇA CONQUISTADA", offline: "ALÉM DA AUSÊNCIA" })[entry.kind]}</span><p>{entry.message}</p></div><time dateTime={entry.at}>{new Date(entry.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time></div>)}</div></section>}

          <footer className="page-footer"><span><span className="brand-mini">ϟ</span> UM MUNDO FRAGMENTADO. INFINITAS POSSIBILIDADES.</span><span>Feito para descobrir, não para correr.</span></footer>
        </>}
      </main>
    </div>

    {game?.player.isGuest && <button className="guest-save" onClick={() => { setAuthMode("register"); setAuthError(""); setDialog("auth"); }}><Shield size={15}/><span>Guarde sua jornada</span><ArrowRight size={14}/></button>}
    {toast && <div className="toast" role="status"><Sparkles size={17}/><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Fechar mensagem"><X size={15}/></button></div>}

    {dialog && <Modal onClose={closeDialog} canClose={Boolean(game)} label={dialog === "auth" ? "Sua conta" : dialog === "evolve" ? "Escolher evolução" : dialog === "offline" ? "Recompensas offline" : dialog === "settings" ? "Preferências" : "Guia do viajante"}>
      {dialog === "auth" && <><span className="dialog-emblem">ϟ</span><span className="eyebrow">TODO VÍNCULO TEM UM COMEÇO</span><h2>{authMode === "register" ? "Sua jornada merece ficar." : "O mundo sentiu sua falta."}</h2><p className="dialog-description">{authMode === "register" ? "Crie sua conta e continue de onde parou, em qualquer dispositivo. Nenhuma carteira necessária." : "Entre na sua conta. Há fragmentos esperando por você."}</p><form className="auth-form" onSubmit={authenticate}>{authMode === "register" && <label>Como devemos te chamar?<input autoComplete="nickname" name="name" placeholder="Seu nome de viajante" required minLength={2} maxLength={30}/></label>}<label>E-mail<input type="email" name="email" autoComplete="email" placeholder="voce@exemplo.com" required maxLength={254}/></label><label>Senha<input type="password" name="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} placeholder="Pelo menos 8 caracteres" required minLength={8} maxLength={128}/></label>{authError && <p className="form-error" role="alert">{authError}</p>}<button className="primary-button" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin"/> : <ArrowRight size={17}/>} {authMode === "register" ? "Criar conta e guardar jornada" : "Voltar à jornada"}</button></form><button className="auth-switch" onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }}>{authMode === "register" ? "Já tem uma conta? Entre aqui" : "Primeira vez por aqui? Crie uma conta"}</button>{!game && <button className="text-link guest-auth" onClick={() => { setDialog(null); setBooting(true); void load(true); }}>Explorar como visitante <ArrowRight size={14}/></button>}</>}
      {dialog === "evolve" && game && <><span className="dialog-icon"><Dna size={29}/></span><span className="eyebrow">UM CAMINHO SEM VOLTA</span><h2>A fome muda de forma.</h2><p className="dialog-description">Escolha o que o Devorador irá consumir. Esta decisão é permanente e transforma seus atributos e aparência.</p><div className="evolution-choices">{([{ path: "organic", name: "Predador de raízes", label: "CONSUMIR MATÉRIA ORGÂNICA", description: "A vida encontra um novo caminho. Mais vida e poder de ataque.", icon: Leaf }, { path: "metal", name: "Máquina profana", label: "CONSUMIR METAL", description: "Uma fome revestida de ferro. Mais defesa e resistência.", icon: Shield }] as const).map(option => <div className="evolution-choice" key={option.path}><option.icon size={26}/><span className="eyebrow">{option.label}</span><h3>{option.name}</h3><p>{option.description}</p><button className="outline-button" disabled={busy || Boolean(c!.evolution) || c!.level < game.costs.evolutionLevel || game.player.gold < game.costs.evolution} onClick={() => { if (window.confirm(`Transformar em ${option.name}? Essa escolha é permanente.`)) void act({ action: "evolve", path: option.path }, "O impossível encontrou uma nova forma."); }}>Escolher caminho <ArrowRight size={14}/></button></div>)}</div><p className="requirement-note">Requer nível {game.costs.evolutionLevel} e {game.costs.evolution} Gold. Você está no nível {c!.level}.</p></>}
      {dialog === "offline" && game?.offline && <><span className="dialog-icon"><Timer size={30}/></span><span className="eyebrow">A VIDA ENCONTRA UM CAMINHO</span><h2>Enquanto você estava longe.</h2><p className="dialog-description">Seu Devorador continuou explorando por {duration(game.offline.seconds)}. Os resultados foram calculados pelo servidor, com limite de {game.offline.maxHours} horas.</p><div className="offline-rewards"><div><Coins size={22}/><strong>+{number(game.offline.gold)}</strong><span>GOLD</span></div><div><Sparkles size={22}/><strong>+{number(game.offline.xp)}</strong><span>EXPERIÊNCIA</span></div><div><Swords size={22}/><strong>{number(game.offline.kills)}</strong><span>DERROTADOS</span></div></div><p className="requirement-note">{game.offline.items ? `${game.offline.items} equipamento(s) encontrado(s). ` : ""}A XP já foi incorporada ao nível da criatura. Colete Gold, Gemas e equipamentos encontrados.</p><button className="primary-button" disabled={busy} onClick={() => void act({ action: "claimOffline" }, "Recompensas coletadas. Sua jornada continua.")}><ArrowDownToLine size={17}/> Coletar recompensas</button></>}
      {dialog === "help" && <><span className="dialog-emblem">ϟ</span><span className="eyebrow">BEM-VINDO AO QUE RESTOU</span><h2>Depois do fim, o começo.</h2><p className="dialog-description">A Ruptura fundiu realidades que nunca deveriam se encontrar. Entre as ruínas, você encontrou uma criatura. Ou ela encontrou você.</p><div className="help-steps"><div><Swords size={22}/><div><h3>Ela luta. Você escolhe.</h3><p>O combate é 100% automático. Ganhe Gold e XP, avance por fases e enfrente um boss a cada cinco fases.</p></div></div><div><TrendingUp size={22}/><div><h3>Pequenas escolhas. Novas formas.</h3><p>Fortaleça sua criatura, equipe descobertas do inventário e escolha uma evolução permanente no nível 5.</p></div></div><div><Timer size={22}/><div><h3>Você pode ir. A jornada fica.</h3><p>Volte para coletar até 8 horas de recompensas offline. Crie sua conta para acessar a mesma jornada em outro dispositivo.</p></div></div></div><button className="primary-button" onClick={() => setDialog(null)}>Há muito a descobrir <ArrowRight size={16}/></button><p className="requirement-note">Primeiro fragmento · MVP 0.1. Fendas, equipes, marketplace e carteiras serão construídos nas próximas etapas.</p></>}
      {dialog === "settings" && <><span className="dialog-icon"><Eye size={28}/></span><span className="eyebrow">SEU VÍNCULO COM O MUNDO</span><h2>{game?.player.name}</h2><p className="dialog-description">A jornada está vinculada à sua conta. Gold, experiência e descobertas são guardados automaticamente.</p><label className="toggle-row"><span><strong>Reduzir movimento</strong><small>Menos efeitos no cenário e nas criaturas.</small></span><input type="checkbox" checked={reducedMotion} onChange={event => { setReducedMotion(event.target.checked); localStorage.setItem("ruptura-reduced-motion", String(event.target.checked)); }}/></label><button className="outline-button logout-button" onClick={logout} disabled={busy}><LogOut size={16}/> Sair da conta</button></>}
    </Modal>}
  </div>;
}

function ItemCard({ item, equipped, busy, onEquip }: { item: Gear; equipped: boolean; busy: boolean; onEquip: () => void }) {
  const Icon = item.slot === "weapon" ? Swords : item.slot === "armor" ? Shield : Gem;
  return <article className={`item-card ${equipped ? "equipped" : ""} ${item.rarity === "Raro" ? "rare" : ""}`}><div className="item-art"><Icon size={36} strokeWidth={1.2}/>{equipped && <span><Check size={12}/> EQUIPADO</span>}</div><span className="eyebrow">{item.rarity.toUpperCase()}</span><h3>{item.name}</h3><p>{item.description}</p><div className="item-stats">{item.attack > 0 && <span>+{item.attack} ATQ</span>}{item.defense > 0 && <span>+{item.defense} DEF</span>}{item.health > 0 && <span>+{item.health} HP</span>}</div><button className="outline-button" disabled={busy || equipped} onClick={onEquip}>{equipped ? <Check size={15}/> : <Plus size={15}/>} {equipped ? "Equipado" : "Equipar criatura"}</button></article>;
}

function Modal({ children, onClose, label, canClose }: { children: ReactNode; onClose: () => void; label: string; canClose: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    const getFocusables = () => Array.from(node?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex="0"]') || []);
    getFocusables()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canClose) onClose();
      if (event.key === "Tab") {
        const items = getFocusables(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", keydown); before?.focus(); };
  }, [canClose, onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && canClose) onClose(); }}><div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={label}>{canClose && <button className="modal-close icon-button" onClick={onClose} aria-label="Fechar janela"><X size={20}/></button>}{children}</div></div>;
}
