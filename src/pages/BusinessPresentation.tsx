import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, Users, Video, Timer, Target, Shield, Zap, Eye, TrendingUp,
  PlayCircle, UserCheck, Database, Smartphone, Globe, Check, Crown, Star,
  Share2, Lightbulb, Building, School, ArrowRight, ChevronLeft, ChevronRight,
  Trophy, Activity, Mic, Calendar, Bell, FileText, PieChart, Map, LineChart,
  Camera, Clock, MessageSquare, Headphones, Radar, Hash, BarChart, TrendingDown,
  Award, Settings, Lock, Flag
} from 'lucide-react';

const BusinessPresentation: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // ENHANCEMENT: All text content is now in Algerian Darija.
  const slides = [
    // Slide 1: Title
    {
      id: 'title',
      title: 'FootballAnalytics Pro: Er-Reb7a Tetbna Hna',
      subtitle: 'Sla7ek es-serri bach tseyter 3la l\'foot dziri',
      content: (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 bg-gradient-to-br from-green-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <Trophy className="h-16 w-16 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              FootballAnalytics Pro
            </h1>
            <p className="text-2xl text-slate-600 max-w-4xl mx-auto">
              Medd l'club dyalek avantage kbir b'la plateforme li terja3 kol match dars f'la tactique.
            </p>
            <Badge className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200 px-8 py-3 text-lg">
              Présentation l'les Clubs ta3 Dzayer
            </Badge>
          </div>
        </div>
      )
    },

    // Slide 2: Problem Statement
    {
      id: 'problem',
      title: 'L\'Macha_kel ta3 l\'Foot f\'Dzayer L\'youm',
      subtitle: 'L\'3afssat li y7absou l\'performance w takwin ta3ek.',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6">Mochkil wach y_sra bezzaf</h3>
            {[
              { 
                icon: <Timer className="h-8 w-8 text-red-500" />, 
                title: "Ta7lil b'yedek: y'ched l'weqt w fih ghalta", 
                desc: "Swaye3 w nta t3awed fel match, w t9edr trati 7wayej mouhimin." 
              },
              { 
                icon: <Database className="h-8 w-8 text-orange-500" />, 
                title: "Les données m_cher_tine", 
                desc: "Les stats, les vidéos, les rapports... kol 7aja f'blassa. Ma tfehem walou." 
              },
              { 
                icon: <Users className="h-8 w-8 text-yellow-500" />, 
                title: "S3ib tel9a les joueurs es-sa7", 
                desc: "Ma t9edrch tchouf objectivement la progression ta3 les jeunes w tel9a les pépites." 
              },
              { 
                icon: <Share2 className="h-8 w-8 text-blue-500" />, 
                title: "Makach coordination fel staff", 
                desc: "Khedma s3iba bin l'analyste, l'entraineur w l'administration." 
              }
            ].map((problem, index) => (
              <div key={index} className="flex gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 border-red-400">
                <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg">{problem.icon}</div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">{problem.title}</h4>
                  <p className="text-slate-600">{problem.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6">Wach rak trati ki ma t_bougich</h3>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border border-red-200">
              <div className="space-y-6">
                <div className="text-center">
                  <TrendingDown className="h-16 w-16 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">Décisions retard</p>
                  <p className="text-lg text-slate-600">Les changements tactiques yjiw retard, tkhosser des points ghaline.</p>
                </div>
                <div className="text-center">
                  <UserCheck className="h-16 w-16 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">Talents y_ro7o batel</p>
                  <p className="text-lg text-slate-600">Des jeunes 3andhom potentiel, mais ma ybanouch wela y'perdo.</p>
                </div>
                <div className="text-center">
                  <Clock className="h-16 w-16 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">L'weqt y_rou7 f'lkhawi</p>
                  <p className="text-lg text-slate-600">Le staff ta3ek y_daya3 weqtou fel papiers kter men terrain.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3: Solution Overview
    {
      id: 'solution',
      title: 'Men Data lel Reb7a fo9 Terrain',
      subtitle: 'FootballAnalytics Pro yjem_3, y_7allel w ybedel ga3 l\'vision ta3ek lel jeu.',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-12 w-12 text-blue-600" />,
                title: "Ma trati 7etta action",
                desc: "B' 'Piano Tactique' dyalna, t_marki kol 7aja f'lmatch b'zerba w sans faute.",
                gradient: "from-blue-500/10 to-indigo-500/10"
              },
              {
                icon: <Video className="h-12 w-12 text-indigo-600" />,
                title: "Kol angle, kol décision",
                desc: "Relier les stats m3a la vidéo direct, bach tefhem '3lach' srat kol action.",
                gradient: "from-indigo-500/10 to-purple-500/10"
              },
              {
                icon: <Users className="h-12 w-12 text-purple-600" />,
                title: "Staff technique yedd wa7da",
                desc: "L'analyste, l'coach, le scout... kamel yekhedmou m3a ba3d en temps réel, win ma kanou.",
                gradient: "from-purple-500/10 to-violet-500/10"
              }
            ].map((item, index) => (
              <Card key={index} className={`border border-slate-200/50 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${item.gradient} rounded-2xl`}>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{item.icon}</div>
                  <CardTitle className="text-xl text-slate-900">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8"><p className="text-slate-600 text-center">{item.desc}</p></CardContent>
              </Card>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Netija: KhouD décisions b'zerba, b'daka2, w rbe7 les matchs kter.</h3>
            <p className="text-xl opacity-90 max-w-4xl mx-auto">
              Optimiser la préparation, kowen les joueurs tawek, w freD le style de jeu dyalek 3la l'adversaire.
            </p>
          </div>
        </div>
      )
    },

    // Slide 4: Core Features
    {
      id: 'features',
      title: 'Les Options li Y_khalouk Terbe7',
      subtitle: 'Kolchi li yesta7e9ou le staff dyalek, f\'blassa wa7da sahla.',
      content: (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { category: "📊 Ta7akoum Tacti_ki", features: [
              { icon: <Timer />, text: "Saisie d'actions live b' 'Piano Tactique'" },
              { icon: <Map />, text: "Heatmaps (carte thermique) w positions" },
              { icon: <BarChart />, text: "Stats avancées l'joueur w l'équipe" },
              { icon: <Radar />, text: "Profils ta3 performance (Radar Charts)" }]
            },
            { category: "🎥 Analyse Vidéo Dayra Fih", features: [
              { icon: <Video />, text: "Synchronisation parfaite data m3a vidéo" },
              { icon: <PlayCircle />, text: "Création playlists (ex: ga3 les passes ratées)" },
              { icon: <Eye />, text: "Outils ta3 rsem w annotation 3la vidéo" },
              { icon: <Camera />, text: "Import sahel (YouTube, Fichier local...)" }]
            },
            { category: "👥 Gestion & Takwin", features: [
              { icon: <Users />, text: "Base de données kamla (joueurs, équipes)" },
              { icon: <School />, text: "Suivi ta3 progression dyal les jeunes" },
              { icon: <UserCheck />, text: "Scouting w analyse ta3 l'adversaire" },
              { icon: <Share2 />, text: "Partage sahel ta3 rapports w vidéos" }]
            },
            { category: "🤝 Khedmet le Staff M3a Ba3d", features: [
              { icon: <Mic />, text: "Communication b'sot en direct (Live)" },
              { icon: <Bell />, text: "Notifications w ta3yin l'mahame" },
              { icon: <Settings />, text: "Gestion ta3 les rôles (Coach, Analyste...)" },
              { icon: <Lock />, text: "Sécurité w sirriya ta3 les données" }]
            }
          ].map((section, index) => (
            <Card key={index} className="p-6 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{section.category}</h3>
              <div className="space-y-4 flex-grow">
                {section.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-700 mt-1">{feature.icon}</div>
                    <span className="text-slate-700">{feature.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )
    },
    
    // Slide 5: Business Benefits
    {
      id: 'benefits',
      title: 'Investissement lel Gloire w l\'Mosta9bel',
      subtitle: 'Natayej ma_7soussa fo9 terrain, f\'khedmetkom, w f\'drahamkom.',
      content: (
         <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Trophy className="h-12 w-12 text-yellow-600" />,
                title: "Avantage Riyadi",
                desc: "Trbe7 kter les matchs b'une bonne préparation tactique w analyse mli7a ta3 l'adversaire.",
                color: "from-yellow-500/10 to-amber-500/10", borderColor: "border-yellow-300"
              },
              {
                icon: <TrendingUp className="h-12 w-12 text-green-600" />,
                title: "T_tela3 f'la Valeur ta3 les Joueurs",
                desc: "Detecter, kowen, w teba3 les jeunes dyawlek bach tebni l'équipe ta3 ghodwa w t_jib drahem.",
                color: "from-green-500/10 to-emerald-500/10", borderColor: "border-green-300"
              },
              {
                icon: <Clock className="h-12 w-12 text-blue-600" />,
                title: "Trbe7 l'Weqt w l'Efficacité",
                desc: "Automatiser l'khedma li t'ched l'weqt w khalli le staff y'concentri 3la l'essentiel: l'foot.",
                color: "from-blue-500/10 to-indigo-500/10", borderColor: "border-blue-300"
              }
            ].map((benefit, index) => (
              <Card key={index} className={`bg-gradient-to-br ${benefit.color} border ${benefit.borderColor} rounded-2xl hover:shadow-xl transition-all duration-300 text-center`}>
                <CardHeader className="pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{benefit.icon}</div>
                  <CardTitle className="text-2xl text-slate-900">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8"><p className="text-slate-600 text-lg">{benefit.desc}</p></CardContent>
              </Card>
            ))}
          </div>
      )
    },

    // Slide 6: Pricing & Packages
    {
      id: 'pricing',
      title: 'Des Offres 3la 7sab l\'ambition ta3ek',
      subtitle: 'Swa rak centre de formation wela club yjoué 3la titre, 3andna l\'7al.',
      content: (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Pack Takwin",
                price: "3la 7sab الطلب",
                description: "L'essentiel l'takwin w suivi ta3 les équipes de jeunes.",
                icon: <School className="h-6 w-6 text-blue-600" />,
                features: [
                  "Analyse jusqu'à 5 matchs/ch_har",
                  "2 utilisateurs (analystes/coachs)",
                  "Statistiques de base",
                  "Suivi ta3 la progression",
                  "Support b'email w WhatsApp"
                ],
                cardStyle: "bg-white border-slate-200", buttonStyle: "bg-slate-900 hover:bg-slate-800", buttonText: "Otlob Devis"
              },
              {
                name: "Pack El 7irafi",
                price: "3la 7sab الطلب",
                description: "Le solution kamla l'les clubs pro li y_7awssou 3la performance.",
                icon: <Trophy className="h-6 w-6 text-green-600" />,
                features: [
                  "Matchs & Analystes bla 7doud",
                  "Analyse vidéo avancée",
                  "Communication b'sot direct",
                  "Scouting & Analyse adversaires",
                  "Support prioritaire 24/7",
                  "Formation l'staff dyalek"
                ],
                popular: true, cardStyle: "bg-gradient-to-br from-green-50 to-blue-50 border-green-300 shadow-2xl scale-105", buttonStyle: "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700", buttonText: "Otlob Devis"
              },
              {
                name: "Pack Fédéralia",
                price: "Charaka",
                description: "Solution sur-mesure l'les fédérations w directions techniques.",
                icon: <Flag className="h-6 w-6 text-red-600" />,
                features: [
                  "Déploiement watani",
                  "Base de données markaziya l'talents",
                  "Infrastructure khassa w sécurisée",
                  "Développement fonctionnalités spécifiques",
                  "Mourafa9a stratégique"
                ],
                cardStyle: "bg-white border-slate-200", buttonStyle: "bg-red-700 hover:bg-red-800", buttonText: "Contactina"
              }
            ].map((plan, index) => (
              <Card key={index} className={`${plan.cardStyle} transition-all duration-300 rounded-2xl overflow-hidden flex flex-col`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 shadow-lg">L'aktar Talaban</Badge></div>}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{plan.icon}</div>
                  <CardTitle className="text-2xl text-slate-900 mb-3">{plan.name}</CardTitle>
                  <div className="mb-3"><span className="text-4xl font-bold text-slate-900">{plan.price}</span></div>
                  <p className="text-slate-600 px-4 h-16">{plan.description}</p>
                </CardHeader>
                <CardContent className="px-8 pb-8 flex flex-col flex-grow">
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, i) => <li key={i} className="flex items-center gap-3"><Check className="h-5 w-5 text-green-500 flex-shrink-0" /><span className="text-slate-700">{feature}</span></li>)}
                  </ul>
                  <Button className={`w-full ${plan.buttonStyle} shadow-lg hover:shadow-xl transition-all duration-300 py-3 mt-auto`}>{plan.buttonText}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-slate-500 italic">Les devis b'Dinar (DZD) wella l'Euro, kima t7eb.</p>
        </div>
      )
    },
    
    // Slide 7: Implementation & Support
    {
      id: 'implementation',
      title: 'M3ak men l\'awal lel lekher',
      subtitle: 'Ma ranach ghir fournisseur. Rana fard men l\'équipe dyalek.',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">Kifech Nebdaw L'khedma</h3>
            <div className="space-y-6">
              {[
                { step: "1", title: "Nefahmou wach te_s7a9o", desc: "Nchoufo wach te_s7a9o besa7 bach nreglou l'plateforme 3likom.", duration: "1-2 jours" },
                { step: "2", title: "Formation l'staff", desc: "Formation pratique l'les coachs w les analystes (f'terrain wela à distance).", duration: "2-3 jours" },
                { step: "3", title: "Lancement w Suivi", desc: "N_we9fou m3akoum f'les matchs lewline bach kolchi yemchi mli7.", duration: "Continu" }
              ].map((phase, index) => (
                <div key={index} className="flex gap-6 p-6 bg-white rounded-xl shadow-lg border-l-4 border-green-500">
                  <div className="flex-shrink-0"><div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{phase.step}</div></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2"><h4 className="text-xl font-semibold text-slate-900">{phase.title}</h4><Badge variant="secondary">{phase.duration}</Badge></div>
                    <p className="text-slate-600">{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">Support Y_hder Loughtek</h3>
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-4 mb-4"><Headphones className="h-8 w-8 text-blue-600" /><h4 className="text-xl font-bold text-slate-900">Support Technique Spécial</h4></div>
                <ul className="space-y-2 text-slate-700 list-disc list-inside">
                  <li><strong>Support b'Français w b'Derja</strong></li>
                  <li>Disponible via WhatsApp, Téléphone w Email</li>
                  <li>Un interlocuteur wa7ed l'club dyalek</li>
                </ul>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-4 mb-4"><Lightbulb className="h-8 w-8 text-green-600" /><h4 className="text-xl font-bold text-slate-900">Toujours Jdid</h4></div>
                <ul className="space-y-2 text-slate-700 list-disc list-inside">
                  <li>Mises à jour daymen 3la 7sab ra2y dyalkom</li>
                  <li>Tchouf les fonctionnalités jdad ntaya l'owel</li>
                  <li>Plateforme tetala3 m3a l'foot l'jdida</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )
    },

    // Slide 8: Call to Action
    {
      id: 'cta',
      title: 'Wajed bach tbedel l\'club dyalek?',
      subtitle: 'Rejoindre l\'élite ta3 les clubs li khayrou ma ykhalouch er-reb7a lel hasard.',
      content: (
        <div className="text-center space-y-12">
          <div className="space-y-8">
             <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 text-white shadow-2xl">
              <h3 className="text-4xl font-bold mb-6">Otlob Démo Personnalisée ta3ek</h3>
              <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
                Chouf b'3inik kifech FootballAnalytics Pro ye9der yemchi m3a l'club dyalek. Batel w bla engagement.
              </p>
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 text-xl px-12 py-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <Calendar className="mr-3 h-6 w-6" />
                7ab N'chouf Démo Batel!
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">Contact Direct Dzayer</h4>
              <div className="space-y-3 text-left text-lg">
                <p className="text-slate-700 flex items-center gap-2"><strong>WhatsApp/Tél:</strong> +213 (0)X XX XX XX XX</p>
                <p className="text-slate-700 flex items-center gap-2"><strong>Email:</strong> contact.dz@footballanalytics.pro</p>
                <p className="text-slate-700 flex items-center gap-2"><strong>Disponible:</strong> 7j/7 l'les clubs partenaires</p>
              </div>
            </Card>
            
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">L'khotowat Jjayin</h4>
              <div className="space-y-3 text-left text-lg">
                <p className="text-slate-700 flex items-start gap-2"><ArrowRight className="text-green-500 mt-1 h-5 w-5"/> Démo personnalisée (30 min)</p>
                <p className="text-slate-700 flex items-start gap-2"><ArrowRight className="text-green-500 mt-1 h-5 w-5"/> Devis sur-mesure l'club dyalek</p>
                <p className="text-slate-700 flex items-start gap-2"><ArrowRight className="text-green-500 mt-1 h-5 w-5"/> Période d'essai l'staff ta3ek</p>
              </div>
            </Card>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index: number) => setCurrentSlide(index);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-50">
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">FootballAnalytics Pro</span>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <span className="text-sm text-slate-600">{currentSlide + 1} / {slides.length}</span>
        </div>
      </div>

      <div className="pt-24 pb-20 px-4 sm:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">{slides[currentSlide].title}</h1>
            <p className="text-lg lg:text-xl text-slate-600 max-w-4xl mx-auto">{slides[currentSlide].subtitle}</p>
          </div>
          <div className="min-h-[600px] flex items-center justify-center">
            <div className="w-full">{slides[currentSlide].content}</div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full px-6 py-4 shadow-xl">
          <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentSlide === 0} className="rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="flex gap-2">
            {slides.map((slide, index) => <button key={slide.id} onClick={() => goToSlide(index)} aria-label={`Go to slide ${index + 1}`} className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentSlide ? 'bg-green-600 scale-125' : 'bg-slate-300 hover:bg-slate-400'}`} />)}
          </div>
          <Button variant="outline" size="sm" onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessPresentation;