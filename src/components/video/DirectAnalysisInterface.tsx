// src/components/video/DirectAnalysisInterface.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactSketchCanvasRef } from 'react-sketch-canvas';
import { VideoPlayerControls } from './analysis/VideoPlayerControls';
import { AnnotationObject, AnnotationToolbox } from './analysis/AnnotationToolbox';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Download, Settings as SettingsIcon, XSquare, ListVideo, PlayCircle, CheckCircle,
    ListPlus, Trash2, ArrowUp, ArrowDown, Edit2, Check, X as XIcon,
    Play, StopCircle, SkipBack, SkipForward, Pause
} from 'lucide-react';
import { EventTypeManager, LocalEventType as EventTypeDefinition, PropertyDefinition } from './analysis/EventTypeManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlaylistItem { id: string; taggedEventId: string; order: number; customNotes?: string; }
interface Playlist { id: string; name: string; description?: string; items: PlaylistItem[]; createdAt: string; updatedAt: string; }
export interface LocalTaggedEvent { id: string; timestamp: number; typeId: string; typeName: string; notes?: string; annotations?: AnnotationObject[] | null; customPropertyValues?: { [propId: string]: string | number | boolean | null; }; }
interface DirectAnalysisInterfaceProps { videoUrl: string; }

const PLAYLIST_CLIP_START_OFFSET = -2;
const PLAYLIST_CLIP_END_OFFSET = 5;

export const DirectAnalysisInterface: React.FC<DirectAnalysisInterfaceProps> = ({ videoUrl }) => {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [taggedEvents, setTaggedEvents] = useState<LocalTaggedEvent[]>([]);
  const [selectedEventForAnnotation, setSelectedEventForAnnotation] = useState<LocalTaggedEvent | null>(null);
  const [eventTypeDefs, setEventTypeDefinitions] = useState<EventTypeDefinition[]>([]);
  const [showEventTypeManager, setShowEventTypeManager] = useState(false);
  const [selectedEventTypeIdForTagging, setSelectedEventTypeIdForTagging] = useState<string>('');
  const [currentCustomPropValues, setCurrentCustomPropValues] = useState<{ [propId: string]: string | number | boolean | null }>({});
  const [filterEventTypeId, setFilterEventTypeId] = useState<string>('');
  const [filterPropertyId, setFilterPropertyId] = useState<string>('');
  const [filterPropertyValue, setFilterPropertyValue] = useState<string>('');
  const [availableFilterProperties, setAvailableFilterProperties] = useState<PropertyDefinition[]>([]);
  const [activeFiltersDescription, setActiveFiltersDescription] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [editingPlaylistItemNotes, setEditingPlaylistItemNotes] = useState<{ playlistId: string, itemId: string, currentNotes: string } | null>(null);
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
  const [currentPlaylistItemIndex, setCurrentPlaylistItemIndex] = useState(0);
  const [activePlaylistForPlayback, setActivePlaylistForPlayback] = useState<Playlist | null>(null);
  const [isPlaylistPaused, setIsPlaylistPaused] = useState(false);
  const [currentClipEndTime, setCurrentClipEndTime] = useState<number | null>(null);

  const formatTime = (seconds: number | null | undefined): string => { /* ... */ return ((h,m,s) => h > 0 ? `${h.toString().padStart(2,'0')}:${m}:${s}` : `${m}:${s}`) (Math.floor((seconds||0)/3600),Math.floor(((seconds||0)%3600)/60).toString().padStart(2,'0'),Math.floor((seconds||0)%60).toString().padStart(2,'0')) };

  useEffect(() => {
    setTaggedEvents([]); setSelectedEventForAnnotation(null); setIsPlaying(false); setCurrentTime(0); setDuration(0);
    if (videoPlayerRef.current) {
        videoPlayerRef.current.currentTime = 0; videoPlayerRef.current.pause();
        videoPlayerRef.current.src = videoUrl; videoPlayerRef.current.load();
    }
    if (canvasRef.current) canvasRef.current.resetCanvas();
    setFilterEventTypeId(''); setFilterPropertyId(''); setFilterPropertyValue(''); setActiveFiltersDescription(null);
    handleStopPlaylistPlayback();
  }, [videoUrl]);

  useEffect(() => { // Manage native video controls based on playlist playback
    if (videoPlayerRef.current) {
        videoPlayerRef.current.controls = !isPlaylistPlaying;
    }
  }, [isPlaylistPlaying, videoPlayerRef.current]); // videoPlayerRef.current dependency is okay for this specific effect

  const handleVideoLoadedMetadata = () => { /* ... */ if(videoPlayerRef.current){setDuration(videoPlayerRef.current.duration); setVideoDimensions({width: videoPlayerRef.current.offsetWidth, height: videoPlayerRef.current.offsetHeight});} };
  const handlePlayPause = () => { if(isPlaylistPlaying) return; if(videoPlayerRef.current){if(isPlaying)videoPlayerRef.current.pause(); else videoPlayerRef.current.play(); setIsPlaying(!isPlaying);} };

  const handleTimeUpdate = () => {
    if (videoPlayerRef.current) {
      const newTime = videoPlayerRef.current.currentTime;
      setCurrentTime(newTime);
    }
  };

  const handleStopPlaylistPlayback = useCallback(() => {
    setIsPlaylistPlaying(false);
    setActivePlaylistForPlayback(null);
    setCurrentPlaylistItemIndex(0);
    setIsPlaylistPaused(false);
    setCurrentClipEndTime(null);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setSelectedEventForAnnotation(null);
  }, [videoPlayerRef]); // Added videoPlayerRef

  const playClipAtIndex = useCallback((indexToPlay: number, playlistToPlay: Playlist) => {
    if (!videoPlayerRef.current || !playlistToPlay) { handleStopPlaylistPlayback(); return; }
    if (indexToPlay < 0 || indexToPlay >= playlistToPlay.items.length) { handleStopPlaylistPlayback(); return; }

    setCurrentPlaylistItemIndex(indexToPlay);
    setIsPlaylistPaused(false);
    setCurrentClipEndTime(null);

    const playlistItem = playlistToPlay.items[indexToPlay];
    const eventToPlay = taggedEvents.find(te => te.id === playlistItem.taggedEventId);

    if (eventToPlay) {
      setSelectedEventForAnnotation(eventToPlay);
      const actualClipStartTime = Math.max(0, eventToPlay.timestamp + PLAYLIST_CLIP_START_OFFSET);
      let calculatedEndTime = eventToPlay.timestamp + PLAYLIST_CLIP_END_OFFSET;
      // Ensure clip end time is within video duration AND at least a minimum duration after start time.
      let actualClipEndTime = Math.min(videoPlayerRef.current.duration, calculatedEndTime);
      if (actualClipEndTime <= actualClipStartTime) { // If calculated end is too short or invalid
          actualClipEndTime = Math.min(videoPlayerRef.current.duration, actualClipStartTime + 3); // Default to 3s or video end
      }
      setCurrentClipEndTime(actualClipEndTime);

      videoPlayerRef.current.currentTime = actualClipStartTime;
      videoPlayerRef.current.play().catch(e => { console.error("Error playing video:", e); handleStopPlaylistPlayback(); });
      setIsPlaying(true);
    } else {
      toast.error(`Event data not found for playlist item.`);
      const nextIndex = indexToPlay + 1;
      if (nextIndex < playlistToPlay.items.length) {
        playClipAtIndex(nextIndex, playlistToPlay);
      } else {
        handleStopPlaylistPlayback();
      }
    }
  }, [taggedEvents, videoPlayerRef, handleStopPlaylistPlayback]);

  useEffect(() => { // Auto-advance
    if (isPlaylistPlaying && !isPlaylistPaused && activePlaylistForPlayback && currentClipEndTime !== null && videoPlayerRef.current) {
      if (currentTime >= currentClipEndTime - 0.1) { // Small tolerance for timeupdate precision
        const nextIndex = currentPlaylistItemIndex + 1;
        if (nextIndex < activePlaylistForPlayback.items.length) {
          playClipAtIndex(nextIndex, activePlaylistForPlayback);
        } else {
          toast.info("Playlist finished.");
          handleStopPlaylistPlayback();
        }
      }
    }
  }, [currentTime, isPlaylistPlaying, isPlaylistPaused, currentClipEndTime, currentPlaylistItemIndex, activePlaylistForPlayback, playClipAtIndex, handleStopPlaylistPlayback]);


  const handleSaveAnnotationToEvent = useCallback(async (newAnnotations: AnnotationObject[]) => { /* ... */ if(selectedEventForAnnotation){setTaggedEvents(p=>p.map(e=>e.id===selectedEventForAnnotation.id?{...e,annotations:newAnnotations}:e)); setSelectedEventForAnnotation(p=>p?{...p,annotations:newAnnotations}:null); toast.success(`Annotations saved for event "${selectedEventForAnnotation.typeName}"`);}else{toast.info("No event selected.")} }, [selectedEventForAnnotation]);
  const handleAddEventTypeDefinition = (newTypeData: { name: string; color?: string }) => { /* ... */ setEventTypeDefinitions(p=>[...p,{id:crypto.randomUUID(), ...newTypeData, properties:[]}]); toast.success(`Event type "${newTypeData.name}" created.`); };
  const handleDeleteEventTypeDefinition = (typeIdToDelete: string) => { /* ... */ const N=eventTypeDefs.find(e=>e.id===typeIdToDelete)?.name; if(window.confirm(`Delete "${N}"? Tags & filters using it will be affected.`)){setEventTypeDefinitions(p=>p.filter(e=>e.id!==typeIdToDelete)); setTaggedEvents(p=>p.filter(t=>t.typeId!==typeIdToDelete)); if(selectedEventTypeIdForTagging===typeIdToDelete)setSelectedEventTypeIdForTagging(''); if(filterEventTypeId===typeIdToDelete)handleClearFilter(); toast.info(`Event type "${N}" deleted.`);} };
  const handleUpdateEventTypeDefinition = (updatedType: EventTypeDefinition) => { /* ... */ setEventTypeDefinitions(p=>p.map(e=>e.id===updatedType.id?updatedType:e)); if(filterEventTypeId===updatedType.id&&activeFiltersDescription){const P=availableFilterProperties.find(p=>p.id===filterPropertyId)?.name||'';setActiveFiltersDescription(`Type: ${updatedType.name}, ${P} = "${filterPropertyValue}"`);} toast.info(`Event type "${updatedType.name}" updated.`);};
  useEffect(() => { /* ... (custom prop values effect) ... */ if(!selectedEventTypeIdForTagging){setCurrentCustomPropValues({});return;}const T=eventTypeDefs.find(e=>e.id===selectedEventTypeIdForTagging);if(T&&T.properties.length>0){const I:{[k:string]:any}={};T.properties.forEach(p=>{I[p.id]=p.defaultValue!==undefined?p.defaultValue:p.dataType==='boolean'?false:p.dataType==='number'?0:''});setCurrentCustomPropValues(I);}else{setCurrentCustomPropValues({});}}, [selectedEventTypeIdForTagging, eventTypeDefs]);
  const handleCustomPropValueChange = (propId: string, value: any) => { /* ... */ setCurrentCustomPropValues(p=>({...p,[propId]:value})); };
  const handleAddTaggedEvent = () => { /* ... */ if(!selectedEventTypeIdForTagging){toast.error("Select event type.");return;}if(!videoPlayerRef.current)return;const T=eventTypeDefs.find(e=>e.id===selectedEventTypeIdForTagging);if(!T){toast.error("Event type not found.");return;}const TS=videoPlayerRef.current.currentTime;const E:LocalTaggedEvent={id:crypto.randomUUID(),timestamp:TS,typeId:T.id,typeName:T.name,notes:'',annotations:null,customPropertyValues:{...currentCustomPropValues}};setTaggedEvents(p=>[...p,E].sort((a,b)=>a.timestamp-b.timestamp));setSelectedEventForAnnotation(E);toast.success(`Event "${T.name}" tagged.`);if(T.properties.length>0){const I:{[k:string]:any}={};T.properties.forEach(p=>{I[p.id]=p.defaultValue!==undefined?p.defaultValue:p.dataType==='boolean'?false:p.dataType==='number'?0:''});setCurrentCustomPropValues(I);}else{setCurrentCustomPropValues({});}};
  const handleSelectEventForAnnotation = (event: LocalTaggedEvent) => { if(isPlaylistPlaying) return; /* ... rest ... */ if(selectedEventForAnnotation?.id===event.id){setSelectedEventForAnnotation(null);if(canvasRef.current)canvasRef.current.resetCanvas();}else{setSelectedEventForAnnotation(event);} };
  const handleDeleteTaggedEvent = (eventId: string) => { if(isPlaylistPlaying) return; /* ... rest ... */ setTaggedEvents(p=>p.filter(e=>e.id!==eventId));if(selectedEventForAnnotation?.id===eventId){setSelectedEventForAnnotation(null);if(canvasRef.current)canvasRef.current.resetCanvas();}toast.success("Event deleted."); };
  const handleExportData = () => { /* ... */ if(taggedEvents.length===0&&eventTypeDefs.length===0&&playlists.length===0){toast.info("No data to export.");return;}const D={videoUrl,analysisDate:new Date().toISOString(),eventTypeDefinitions:eventTypeDefs,taggedEvents,playlists};const J=JSON.stringify(D,null,2);const B=new Blob([J],{type:'application/json'});const U=URL.createObjectURL(B);const L=document.createElement('a');L.href=U;let F="video_analysis_data.json";try{const O=new URL(videoUrl);const P=O.pathname.split('/');const S=P[P.length-1];if(S&&S.includes('.'))F=`${S.split('.')[0]}_analysis.json`;else if(S&&S.trim()!=='')F=`${S}_analysis.json`;}catch(e){console.warn("Filename generation failed.",e);}L.download=F;document.body.appendChild(L);L.click();document.body.removeChild(L);URL.revokeObjectURL(U);toast.success("Analysis data exported!"); };
  useEffect(() => { /* ... (filter properties effect) ... */ if(filterEventTypeId){const T=eventTypeDefs.find(e=>e.id===filterEventTypeId);setAvailableFilterProperties(T?.properties||[]);setFilterPropertyId('');setFilterPropertyValue('');}else{setAvailableFilterProperties([]);setFilterPropertyId('');setFilterPropertyValue('');}}, [filterEventTypeId, eventTypeDefs]);
  const handleApplyFilter = () => { /* ... */ if(!filterEventTypeId||!filterPropertyId||filterPropertyValue.trim()===''){toast.info("Select type, property, and value for filter.");if(filterPropertyValue.trim()===''&&activeFiltersDescription)handleClearFilter();return;}const T=eventTypeDefs.find(e=>e.id===filterEventTypeId)?.name||'';const P=availableFilterProperties.find(p=>p.id===filterPropertyId)?.name||'';setActiveFiltersDescription(`Type: ${T}, ${P} = "${filterPropertyValue}"`); };
  const handleClearFilter = () => { /* ... */ setFilterEventTypeId('');setFilterPropertyId('');setFilterPropertyValue('');setAvailableFilterProperties([]);setActiveFiltersDescription(null);toast.success("Filters cleared."); };
  const filteredTaggedEvents = useMemo(() => { /* ... */ if(!activeFiltersDescription||!filterEventTypeId||!filterPropertyId||filterPropertyValue.trim()==='')return taggedEvents;return taggedEvents.filter(e=>{if(e.typeId!==filterEventTypeId)return false;if(!e.customPropertyValues)return false;const V=e.customPropertyValues[filterPropertyId];if(V===undefined||V===null)return false;const D=availableFilterProperties.find(p=>p.id===filterPropertyId);if(D?.dataType==='number')return Number(V)===Number(filterPropertyValue);if(D?.dataType==='boolean')return String(V).toLowerCase()===filterPropertyValue.toLowerCase();return String(V).toLowerCase().includes(filterPropertyValue.toLowerCase());});}, [taggedEvents,filterEventTypeId,filterPropertyId,filterPropertyValue,activeFiltersDescription,availableFilterProperties]);
  const renderCustomPropertyFields = () => { /* ... (JSX for custom prop fields) ... */ if(!selectedEventTypeIdForTagging)return null;const T=eventTypeDefs.find(e=>e.id===selectedEventTypeIdForTagging);if(!T||T.properties.length===0)return null;return(<div className="mt-3 mb-2 space-y-3 p-3 border-t"><h5 className="text-xs font-semibold text-gray-600">Props for "{T.name}"</h5>{T.properties.map(p=>(<div key={p.id}><Label htmlFor={`p-${p.id}`}className="text-xs">{p.name}</Label>{p.dataType==='text'&&<Input id={`p-${p.id}`}type="text"value={currentCustomPropValues[p.id]as string||''}onChange={e=>handleCustomPropValueChange(p.id,e.target.value)}className="h-8 text-xs"/>}{p.dataType==='number'&&<Input id={`p-${p.id}`}type="number"value={currentCustomPropValues[p.id]as number||0}onChange={e=>handleCustomPropValueChange(p.id,parseFloat(e.target.value))}className="h-8 text-xs"/>}{p.dataType==='boolean'&&<div className="flex items-center space-x-2 mt-1"><Checkbox id={`p-${p.id}`}checked={!!currentCustomPropValues[p.id]}onCheckedChange={c=>handleCustomPropValueChange(p.id,!!c)}/><Label htmlFor={`p-${p.id}`}className="text-xs">{currentCustomPropValues[p.id]?"Yes":"No"}</Label></div>}{p.dataType==='select'&&p.selectOptions&&<Select value={currentCustomPropValues[p.id]as string||''}onValueChange={v=>handleCustomPropValueChange(p.id,v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Select ${p.name}`}/></SelectTrigger><SelectContent>{p.selectOptions.map(o=><SelectItem key={o}value={o}className="text-xs">{o}</SelectItem>)}</SelectContent></Select>}</div>))}</div>);};
  const handleCreatePlaylist = () => { if(!newPlaylistName.trim()){toast.error("Playlist name empty.");return;}const N=new Date().toISOString();const P:Playlist={id:crypto.randomUUID(),name:newPlaylistName.trim(),description:newPlaylistDescription.trim()||undefined,items:[],createdAt:N,updatedAt:N};setPlaylists(pL=>[...pL,P]);setActivePlaylistId(P.id);setNewPlaylistName('');setNewPlaylistDescription('');toast.success(`Playlist "${P.name}" created.`);};
  const handleDeletePlaylist = (playlistId: string) => { const P=playlists.find(p=>p.id===playlistId);if(window.confirm(`Delete playlist "${P?.name}"?`)){setPlaylists(pL=>pL.filter(pl=>pl.id!==playlistId));if(activePlaylistId===playlistId)setActivePlaylistId(null);if(activePlaylistForPlayback?.id===playlistId)handleStopPlaylistPlayback();toast.info(`Playlist "${P?.name}" deleted.`);}};
  const handleSetActivePlaylist = (playlistId: string) => { setActivePlaylistId(playlistId); setEditingPlaylistItemNotes(null); };
  const handleAddEventToActivePlaylist = (taggedEventId: string) => { if(!activePlaylistId){toast.error("No active playlist.");return;}setPlaylists(pL=>pL.map(p=>{if(p.id===activePlaylistId){if(p.items.find(i=>i.taggedEventId===taggedEventId)){toast.info("Event already in playlist.");return p;}const I:PlaylistItem={id:crypto.randomUUID(),taggedEventId,order:p.items.length,customNotes:''};toast.success(`Event added to "${p.name}".`);return{...p,items:[...p.items,I],updatedAt:new Date().toISOString()};}return p;}));};
  const handleMovePlaylistItem = (playlistId: string, itemId: string, direction: 'up' | 'down') => { setPlaylists(pP=>pP.map(p=>{if(p.id===playlistId){const iI=p.items.findIndex(i=>i.id===itemId);if(iI===-1)return p;const nI=[...p.items];const iM=nI[iI];if(direction==='up'&&iI>0){nI.splice(iI,1);nI.splice(iI-1,0,iM);}else if(direction==='down'&&iI<nI.length-1){nI.splice(iI,1);nI.splice(iI+1,0,iM);}else return p;const uI=nI.map((item,idx)=>({...item,order:idx}));return{...p,items:uI,updatedAt:new Date().toISOString()};}return p;}));};
  const startEditPlaylistItemNotes = (playlistId: string, itemId: string, currentNotes?: string) => { setEditingPlaylistItemNotes({playlistId,itemId,currentNotes:currentNotes||''});};
  const cancelEditPlaylistItemNotes = () => { setEditingPlaylistItemNotes(null);};
  const handleUpdatePlaylistItemNotes = () => { if(!editingPlaylistItemNotes)return;const{playlistId,itemId,currentNotes}=editingPlaylistItemNotes;setPlaylists(pP=>pP.map(p=>{if(p.id===playlistId){const uI=p.items.map(i=>i.id===itemId?{...i,customNotes:currentNotes}:i);return{...p,items:uI,updatedAt:new Date().toISOString()};}return p;}));setEditingPlaylistItemNotes(null);toast.success("Item notes updated.");};
  const handleRemovePlaylistItem = (playlistId: string, itemId: string) => { setPlaylists(pP=>pP.map(p=>{if(p.id===playlistId){const nI=p.items.filter(i=>i.id!==itemId);const uI=nI.map((item,idx)=>({...item,order:idx}));return{...p,items:uI,updatedAt:new Date().toISOString()};}return p;}));if(editingPlaylistItemNotes?.playlistId===playlistId&&editingPlaylistItemNotes?.itemId===itemId)setEditingPlaylistItemNotes(null);toast.info("Item removed from playlist.");};
  const activePlaylist = useMemo(() => playlists.find(p => p.id === activePlaylistId), [playlists, activePlaylistId]);
  const sortedActivePlaylistItems = useMemo(() => { return activePlaylist ? [...activePlaylist.items].sort((a, b) => a.order - b.order) : []; }, [activePlaylist]);

  const handleStartPlaylistPlayback = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist || playlist.items.length === 0) { toast.error("Playlist not found or is empty."); return; }
    const playlistCopy = JSON.parse(JSON.stringify(playlist)) as Playlist;
    setActivePlaylistForPlayback(playlistCopy);
    setIsPlaylistPlaying(true);
    setIsPlaylistPaused(false);
    setCurrentClipEndTime(null);
    setShowPlaylistManager(false);
    setSelectedEventForAnnotation(null);
    playClipAtIndex(0, playlistCopy);
    toast.info(`Starting playlist: ${playlistCopy.name}`);
  };

  const handleTogglePlaylistPauseResume = () => {
    if (!isPlaylistPlaying || !activePlaylistForPlayback || !videoPlayerRef.current) return;
    if (isPlaylistPaused) {
      setIsPlaylistPaused(false);
      if (currentClipEndTime !== null && videoPlayerRef.current.currentTime >= currentClipEndTime - 0.1) {
        const nextIndex = currentPlaylistItemIndex + 1;
        if (nextIndex < activePlaylistForPlayback.items.length) {
          playClipAtIndex(nextIndex, activePlaylistForPlayback);
        } else {
          handleStopPlaylistPlayback();
        }
      } else {
        videoPlayerRef.current.play().catch(e => console.error("Error resuming video:", e));
        setIsPlaying(true);
      }
    } else {
      setIsPlaylistPaused(true);
      videoPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleNextClip = () => { /* ... */ if(!isPlaylistPlaying||!activePlaylistForPlayback)return;const nI=currentPlaylistItemIndex+1;if(nI<activePlaylistForPlayback.items.length){playClipAtIndex(nI,activePlaylistForPlayback);}else{toast.info("End of playlist.");handleStopPlaylistPlayback();}};
  const handlePreviousClip = () => { /* ... */ if(!isPlaylistPlaying||!activePlaylistForPlayback)return;const pI=currentPlaylistItemIndex-1;if(pI>=0){playClipAtIndex(pI,activePlaylistForPlayback);}else{toast.info("At first clip.");}};

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg">Analysis Workspace</CardTitle>
        <div className="flex items-center gap-2">
            <Button onClick={() => setShowEventTypeManager(prev => !prev)} variant="outline" size="sm" disabled={isPlaylistPlaying}><SettingsIcon className="h-4 w-4 mr-2" /> Event Types</Button>
            <Button onClick={() => setShowPlaylistManager(prev => !prev)} variant="outline" size="sm" disabled={isPlaylistPlaying}><ListVideo className="h-4 w-4 mr-2" /> Playlists</Button>
            <Button onClick={handleExportData} variant="outline" size="sm" title="Export JSON" disabled={isPlaylistPlaying || (taggedEvents.length === 0 && eventTypeDefs.length === 0 && playlists.length === 0)}><Download className="h-4 w-4 mr-2" /> Export</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showEventTypeManager && !isPlaylistPlaying && ( <div className="mb-4 p-4 border rounded-lg bg-slate-50"><EventTypeManager eventTypes={eventTypeDefs} onAddEventType={handleAddEventTypeDefinition} onDeleteEventType={handleDeleteEventTypeDefinition} onUpdateEventType={handleUpdateEventTypeDefinition}/><Button variant="ghost" size="sm" onClick={()=>setShowEventTypeManager(false)} className="mt-2"><XSquare className="h-4 w-4 mr-1"/> Close</Button></div>)}
        {showPlaylistManager && !isPlaylistPlaying && ( <div className="my-4 p-4 border rounded-lg bg-slate-50"><div className="flex justify-between items-center mb-2"><h3 className="text-lg font-semibold">Playlist Manager</h3><Button variant="ghost" size="sm" onClick={() => setShowPlaylistManager(false)}><XSquare className="h-4 w-4 mr-1"/> Close</Button></div><Card className="mb-4"><CardHeader className="pb-2 pt-3"><CardTitle className="text-base">Create New Playlist</CardTitle></CardHeader><CardContent className="space-y-2 pt-2"><Input placeholder="Playlist Name" value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="h-8 text-sm" /><Textarea placeholder="Playlist Description (Optional)" value={newPlaylistDescription} onChange={e => setNewPlaylistDescription(e.target.value)} className="text-sm" rows={2}/><Button onClick={handleCreatePlaylist} size="sm" disabled={!newPlaylistName.trim()} className="h-8 text-xs">Create Playlist</Button></CardContent></Card><h4 className="text-md font-semibold mb-2">Existing Playlists ({playlists.length})</h4>{playlists.length === 0 ? <p className="text-xs text-gray-500">No playlists created.</p> : (<ScrollArea className="h-40 border rounded-md"><ul className="p-2 space-y-1">{playlists.map(pl => (<li key={pl.id} className={`p-2 rounded-md text-xs flex justify-between items-center ${activePlaylistId === pl.id && !isPlaylistPlaying ? 'bg-blue-100 border-blue-300' : 'bg-white border'}`}><div><p className="font-semibold">{pl.name} <span className="text-gray-500 font-normal">({pl.items.length} items)</span></p>{pl.description && <p className="text-gray-600 text-xs mt-0.5">{pl.description}</p>}</div><div className="flex gap-1"><Button variant="outline" size="xs" onClick={() => handleStartPlaylistPlayback(pl.id)} disabled={pl.items.length === 0} className="h-auto py-1 px-2 text-xs"><Play className="h-3 w-3 mr-1"/>Play</Button><Button variant={activePlaylistId === pl.id ? "default" : "outline"} size="xs" onClick={() => handleSetActivePlaylist(pl.id)} className="h-auto py-1 px-2 text-xs">{activePlaylistId === pl.id ? <CheckCircle className="h-3 w-3 mr-1"/> : <PlayCircle className="h-3 w-3 mr-1"/>} Select</Button><Button variant="ghost" size="xs" onClick={() => handleDeletePlaylist(pl.id)} title={`Delete ${pl.name}`} className="h-auto py-1 px-2"><Trash2 className="h-3 w-3 text-red-500" /></Button></div></li>))}</ul></ScrollArea>)}{activePlaylistId && activePlaylist && !isPlaylistPlaying && ( <Card className="mt-4"><CardHeader className="pb-2 pt-3"><CardTitle className="text-base">Items in "{activePlaylist.name}" ({activePlaylist.items.length})</CardTitle></CardHeader><CardContent>{sortedActivePlaylistItems.length === 0 ? <p className="text-xs text-gray-500 py-3 text-center">No events added.</p> : (<ScrollArea className="h-60"><ul className="space-y-2">{sortedActivePlaylistItems.map((item, index) => {const taggedEvent = taggedEvents.find(te => te.id === item.taggedEventId); const isEditingNotes = editingPlaylistItemNotes?.playlistId === activePlaylistId && editingPlaylistItemNotes?.itemId === item.id; return (<li key={item.id} className="p-2 border rounded-md bg-white"><div className="flex justify-between items-start"><div><span className="font-semibold text-xs">{taggedEvent?.typeName||'Event not found'}</span><span className="text-xs text-gray-500 ml-1">@ {formatTime(taggedEvent?.timestamp)}</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon-xs" onClick={()=>handleMovePlaylistItem(activePlaylistId!,item.id,'up')} disabled={index===0} title="Move Up"><ArrowUp className="h-3 w-3"/></Button><Button variant="ghost" size="icon-xs" onClick={()=>handleMovePlaylistItem(activePlaylistId!,item.id,'down')} disabled={index===sortedActivePlaylistItems.length-1} title="Move Down"><ArrowDown className="h-3 w-3"/></Button><Button variant="ghost" size="icon-xs" onClick={()=>handleRemovePlaylistItem(activePlaylistId!,item.id)} title="Remove"><Trash2 className="h-3 w-3 text-red-500"/></Button></div></div>{isEditingNotes?(<div className="mt-1.5 space-y-1"><Textarea value={editingPlaylistItemNotes.currentNotes} onChange={(e)=>setEditingPlaylistItemNotes({...editingPlaylistItemNotes,currentNotes:e.target.value})} className="text-xs h-16" placeholder="Notes..."/><div className="flex gap-1 justify-end"><Button size="xs"variant="ghost"onClick={cancelEditPlaylistItemNotes}className="h-auto py-0.5 px-1.5"><XIcon className="h-3 w-3 mr-1"/>Cancel</Button><Button size="xs"onClick={handleUpdatePlaylistItemNotes}className="h-auto py-0.5 px-1.5"><Check className="h-3 w-3 mr-1"/>Save</Button></div></div>):(<div className="mt-1.5 flex justify-between items-end"><p className="text-xs text-gray-700 flex-grow whitespace-pre-wrap min-h-[1em]">{item.customNotes||<span className="text-gray-400">No notes.</span>}</p><Button variant="outline"size="xs"onClick={()=>startEditPlaylistItemNotes(activePlaylistId!,item.id,item.customNotes)}className="h-auto py-0.5 px-1.5 ml-2"><Edit2 className="h-3 w-3 mr-1"/>Notes</Button></div>)}</li>);})}</ul></ScrollArea>)}</CardContent></Card>)}</div>)}

        {isPlaylistPlaying && activePlaylistForPlayback && (
          <div className="my-4 p-3 border rounded-lg bg-blue-100 dark:bg-blue-800 shadow-md">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h4 className="text-md font-semibold text-blue-700 dark:text-blue-100">Playing: {activePlaylistForPlayback.name}</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-200">
                        Clip {currentPlaylistItemIndex + 1} of {activePlaylistForPlayback.items.length}
                        { activePlaylistForPlayback.items[currentPlaylistItemIndex] &&
                          taggedEvents.find(te => te.id === activePlaylistForPlayback.items[currentPlaylistItemIndex].taggedEventId) &&
                          ` - Event: ${taggedEvents.find(te => te.id === activePlaylistForPlayback.items[currentPlaylistItemIndex].taggedEventId)?.typeName}`
                        }
                    </p>
                    {activePlaylistForPlayback.items[currentPlaylistItemIndex]?.customNotes && (
                        <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">Notes: {activePlaylistForPlayback.items[currentPlaylistItemIndex].customNotes}</p>
                    )}
                </div>
                <Button onClick={handleStopPlaylistPlayback} variant="destructive" size="sm"><StopCircle className="h-4 w-4 mr-2" /> Stop</Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
                <Button onClick={handlePreviousClip} disabled={currentPlaylistItemIndex === 0} size="sm"><SkipBack className="h-4 w-4 mr-1"/> Prev</Button>
                <Button onClick={handleTogglePlaylistPauseResume} size="sm">
                    {isPlaylistPaused ? <Play className="h-4 w-4 mr-1"/> : <Pause className="h-4 w-4 mr-1"/>}
                    {isPlaylistPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button onClick={handleNextClip} disabled={currentPlaylistItemIndex >= activePlaylistForPlayback.items.length - 1} size="sm"><SkipForward className="h-4 w-4 mr-1"/> Next</Button>
            </div>
          </div>
        )}

        <div className="mb-4 bg-black rounded-md relative"> <video ref={videoPlayerRef} controls={false} width="100%" className="rounded-md" onLoadedMetadata={handleVideoLoadedMetadata} onPlay={() => !isPlaylistPlaying && setIsPlaying(true)} onPause={() => !isPlaylistPlaying && setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onSeeked={handleTimeUpdate}><Your browser does not support the video tag.</video> <AnnotationToolbox canvasRef={canvasRef} videoDimensions={videoDimensions} initialAnnotations={selectedEventForAnnotation?.annotations || null} onSaveAnnotations={handleSaveAnnotationToEvent} canSave={!!selectedEventForAnnotation && videoDimensions.width > 0 && !isPlaylistPlaying} disabled={videoDimensions.width === 0 || isPlaylistPlaying} /> </div>
        {!isPlaylistPlaying && <VideoPlayerControls videoPlayerRef={videoPlayerRef} isPlayingPlaylist={isPlaylistPlaying} />}
      <div className={`my-3 p-3 border rounded-md bg-gray-50 ${isPlaylistPlaying ? 'opacity-50 pointer-events-none' : ''}`}> <h4 className="text-sm font-medium mb-2">Filter Events</h4> <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end"><div><Label htmlFor="filter-event-type"className="text-xs">Event Type</Label><Select onValueChange={setFilterEventTypeId}value={filterEventTypeId}disabled={eventTypeDefs.length===0}><SelectTrigger id="filter-event-type"className="h-8 text-xs"><SelectValue placeholder="Select Type"/></SelectTrigger><SelectContent>{eventTypeDefs.map(et=><SelectItem key={et.id}value={et.id}className="text-xs">{et.name}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="filter-property"className="text-xs">Property</Label><Select onValueChange={setFilterPropertyId}value={filterPropertyId}disabled={!filterEventTypeId||availableFilterProperties.length===0}><SelectTrigger id="filter-property"className="h-8 text-xs"><SelectValue placeholder="Select Property"/></SelectTrigger><SelectContent>{availableFilterProperties.map(p=><SelectItem key={p.id}value={p.id}className="text-xs">{p.name} ({p.dataType})</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="filter-value"className="text-xs">Value</Label><Input id="filter-value"value={filterPropertyValue}onChange={e=>setFilterPropertyValue(e.target.value)}placeholder="Enter value"disabled={!filterPropertyId}className="h-8 text-xs"/></div><div className="flex gap-2"><Button onClick={handleApplyFilter}size="sm"className="h-8 text-xs"disabled={!filterPropertyId||filterPropertyValue.trim()===''}>Apply</Button><Button onClick={handleClearFilter}variant="outline"size="sm"className="h-8 text-xs"disabled={!activeFiltersDescription}>Clear</Button></div></div> {activeFiltersDescription&&<p className="text-xs text-blue-600 mt-1">Active Filter: {activeFiltersDescription}</p>} </div>
        <div className={`my-3 p-3 border rounded-md ${isPlaylistPlaying ? 'opacity-50 pointer-events-none' : ''}`}> <div className="flex justify-between items-center mb-2"><h4 className="font-medium text-sm">Tag Event</h4></div> <div className="flex items-center gap-2 mb-2"><Select value={selectedEventTypeIdForTagging} onValueChange={setSelectedEventTypeIdForTagging} disabled={duration === 0 || eventTypeDefs.length === 0}><SelectTrigger className="w-full md:w-[200px] h-8 text-xs"><SelectValue placeholder="Select Event Type" /></SelectTrigger><SelectContent>{eventTypeDefs.length === 0 && <SelectItem value="" disabled>Define types first via Manager</SelectItem>}{eventTypeDefs.map(et => (<SelectItem key={et.id} value={et.id} style={{ color: et.color }} className="text-xs">{et.name}</SelectItem>))}</SelectContent></Select><Button size="sm" onClick={handleAddTaggedEvent} disabled={duration === 0 || !selectedEventTypeIdForTagging}>Tag Event</Button></div> {renderCustomPropertyFields()} <div className="max-h-60 overflow-y-auto space-y-1 mt-2"> {filteredTaggedEvents.length === 0 && <p className="text-xs text-gray-500">{activeFiltersDescription ? 'No events match filter.' : 'No events tagged yet.'}</p>} {filteredTaggedEvents.map(event => { const eventType = eventTypeDefs.find(etd => etd.id === event.typeId); const isEventInActivePlaylist = activePlaylistId ? playlists.find(p => p.id === activePlaylistId)?.items.some(item => item.taggedEventId === event.id) : false; return ( <div key={event.id} onClick={() => !isPlaylistPlaying && handleSelectEventForAnnotation(event)} className={`p-2 text-xs rounded border ${selectedEventForAnnotation?.id === event.id && !isPlaylistPlaying ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'} ${isPlaylistPlaying ? 'cursor-default' : 'cursor-pointer'}`}> <div className="flex justify-between items-start"><div className="flex-grow"><span className="font-semibold" style={eventType?.color ? {color: eventType.color} : {}}>{event.typeName}</span> @ {formatTime(event.timestamp)}{event.annotations && event.annotations.length > 0 && <span className="ml-1 text-blue-500">(A)</span>}</div><div className="flex items-center gap-1 ml-2"><Button variant="outline" size="xs" onClick={(e) => { e.stopPropagation(); handleAddEventToActivePlaylist(event.id);}} disabled={!activePlaylistId || isEventInActivePlaylist || isPlaylistPlaying} title={!activePlaylistId ? "Select a playlist first" : (isEventInActivePlaylist ? "Event already in playlist" : "Add to active playlist")} className="h-auto p-1"><ListPlus className="h-3 w-3" /></Button><Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); handleDeleteTaggedEvent(event.id);}} title="Delete Event" className="h-auto p-1" disabled={isPlaylistPlaying}>X</Button></div></div> {event.customPropertyValues && Object.keys(event.customPropertyValues).length > 0 && ( <div className="mt-1 pt-1 border-t border-gray-200">{eventType?.properties.filter(pD=>event.customPropertyValues![pD.id]!==undefined&&event.customPropertyValues![pD.id]!==null&&String(event.customPropertyValues![pD.id]).trim()!=='').map(pD=>{const V=event.customPropertyValues![pD.id];return(<div key={pD.id}className="text-gray-600"><span className="font-medium text-gray-700">{pD.name}:</span> {typeof V==='boolean'?(V?'Yes':'No'):String(V)}</div>);})}</div>)} </div>);})} </div> <p className="text-xs text-gray-500 mt-1">{filteredTaggedEvents.length} of {taggedEvents.length} events shown.</p> </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"> <Card><CardHeader className="pb-2 pt-3"><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader><CardContent className="text-sm"><p>Total Events: {taggedEvents.length}</p><p>Events with Annotations: {taggedEvents.filter(e => e.annotations && e.annotations.length > 0).length}</p><p>Event Types Defined: {eventTypeDefs.length}</p><p>Playlists Created: {playlists.length}</p></CardContent></Card></Card> </div>
      </CardContent>
    </Card>
  );
};

export default DirectAnalysisInterface;
