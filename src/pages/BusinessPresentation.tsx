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

  const slides = [
    // Slide 1: Title
    {
      id: 'title',
      // ENHANCEMENT: More impactful and tailored title.
      title: 'FootballAnalytics Pro: La Victoire se Prépare Ici',
      subtitle: 'L\'arme secrète pour dominer le football algérien',
      content: (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 bg-gradient-to-br from-green-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            {/* ENHANCEMENT: Using Trophy icon for a winning start */}
            <Trophy className="h-16 w-16 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              FootballAnalytics Pro
            </h1>
            <p className="text-2xl text-slate-600 max-w-4xl mx-auto">
              {/* ENHANCEMENT: More direct and benefit-oriented pitch */}
              Donnez un avantage décisif à votre club avec la plateforme qui transforme chaque match en une leçon stratégique.
            </p>
            <Badge className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200 px-8 py-3 text-lg">
              Présentation pour les Clubs Algériens
            </Badge>
          </div>
        </div>
      )
    },

    // Slide 2: Problem Statement
    {
      id: 'problem',
      // ENHANCEMENT: Title directly addresses their context.
      title: 'Les Défis du Football Algérien Moderne',
      subtitle: 'Les obstacles qui freinent votre performance et votre développement.',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6">Problèmes Fréquents</h3>
            {[
              { 
                icon: <Timer className="h-8 w-8 text-red-500" />, 
                title: "Analyse Manuelle Lente et Imprécise", 
                desc: "Des heures perdues à revoir les matchs, avec le risque de manquer des détails cruciaux." 
              },
              { 
                icon: <Database className="h-8 w-8 text-orange-500" />, 
                title: "Données Éparpillées", 
                desc: "Les stats, les vidéos et les rapports sont dans des systèmes séparés, sans vision d'ensemble." 
              },
              { 
                // ENHANCEMENT: Added a crucial problem for the region: talent development.
                icon: <Users className="h-8 w-8 text-yellow-500" />, 
                title: "Détection des Talents Limitée", 
                desc: "Difficulté à suivre objectivement la progression des jeunes joueurs et à identifier les futures pépites." 
              },
              { 
                icon: <Share2 className="h-8 w-8 text-blue-500" />, 
                title: "Collaboration Difficile", 
                desc: "Manque de communication fluide entre le staff technique, les analystes et la direction." 
              }
            ].map((problem, index) => (
              <div key={index} className="flex gap-4 p-6 bg-white rounded-xl shadow-lg border-l-4 border-red-400">
                <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg">
                  {problem.icon}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">{problem.title}</h4>
                  <p className="text-slate-600">{problem.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {/* ENHANCEMENT: More impactful title */}
            <h3 className="text-3xl font-bold text-slate-900 mb-6">Le Coût de l'Immobilisme</h3>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border border-red-200">
              <div className="space-y-6">
                <div className="text-center">
                  <TrendingDown className="h-16 w-16 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">Décisions Tardives</p>
                  <p className="text-lg text-slate-600">Les ajustements tactiques arrivent trop tard, coûtant des points précieux.</p>
                </div>
                <div className="text-center">
                  <UserCheck className="h-16 w-16 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">Talents Négligés</p>
                  <p className="text-lg text-slate-600">Des jeunes prometteurs ne sont pas détectés ou leur potentiel est mal évalué.</p>
                </div>
                <div className="text-center">
                  <Clock className="h-16 w-16 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">Temps Gaspillé</p>
                  <p className="text-lg text-slate-600">Votre staff passe plus de temps sur l'administratif que sur le terrain.</p>
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
      // ENHANCEMENT: Action-oriented title
      title: 'De la Data à la Victoire sur le Terrain',
      subtitle: 'FootballAnalytics Pro centralise, analyse et transforme votre approche du jeu.',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-12 w-12 text-blue-600" />,
                title: "Ne Manquez Aucune Action",
                desc: "Notre interface 'Piano Tactique' permet une saisie ultra-rapide et précise de chaque événement du match.",
                gradient: "from-blue-500/10 to-indigo-500/10"
              },
              {
                icon: <Video className="h-12 w-12 text-indigo-600" />,
                title: "Chaque Angle, Chaque Décision",
                desc: "Liez instantanément les statistiques à la vidéo pour comprendre le 'pourquoi' derrière chaque action.",
                gradient: "from-indigo-500/10 to-purple-500/10"
              },
              {
                icon: <Users className="h-12 w-12 text-purple-600" />,
                title: "Un Staff Technique Unifié",
                desc: "Permettez à vos analystes, coachs et scouts de collaborer en temps réel, où qu'ils soient.",
                gradient: "from-purple-500/10 to-violet-500/10"
              }
            ].map((item, index) => (
              <Card key={index} className={`border border-slate-200/50 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${item.gradient} rounded-2xl`}>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">
                    {item.icon}
                  </div>
                  <CardTitle className="text-xl text-slate-900">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <p className="text-slate-600 text-center">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white text-center">
            {/* ENHANCEMENT: Strong, clear result statement. */}
            <h3 className="text-3xl font-bold mb-4">Résultat : Prenez des décisions plus rapides, plus intelligentes et gagnez plus de matchs.</h3>
            <p className="text-xl opacity-90 max-w-4xl mx-auto">
              Optimisez votre préparation, développez vos joueurs et imposez votre style de jeu face à n'importe quel adversaire.
            </p>
          </div>
        </div>
      )
    },

    // Slide 4: Core Features (Renamed categories for clarity)
    {
      id: 'features',
      title: 'Fonctionnalités Conçues pour Gagner',
      subtitle: 'Tout ce dont votre staff a besoin, réuni en une seule plateforme intuitive.',
      content: (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { category: "📊 Maîtrise Tactique", features: [
              { icon: <Timer />, text: "Saisie d'événements live via 'Piano Tactique'" },
              { icon: <Map />, text: "Cartes de chaleur (Heatmaps) et positions" },
              { icon: <BarChart />, text: "Statistiques avancées par joueur et équipe" },
              { icon: <Radar />, text: "Profils de performance (Radar Charts)" }]
            },
            { category: "🎥 Analyse Vidéo Intégrée", features: [
              { icon: <Video />, text: "Synchronisation parfaite entre data et vidéo" },
              { icon: <PlayCircle />, text: "Création de playlists par action (ex: toutes les passes ratées)" },
              { icon: <Eye />, text: "Outils de dessin et d'annotation sur la vidéo" },
              { icon: <Camera />, text: "Import facile (YouTube, Fichier local...)" }]
            },
            { category: "👥 Gestion & Formation", features: [
              { icon: <Users />, text: "Base de données complète (joueurs, équipes)" },
              { icon: <School />, text: "Suivi de la progression des jeunes talents" },
              { icon: <UserCheck />, text: "Scouting et analyse des adversaires" },
              { icon: <Share2 />, text: "Partage facile des rapports et vidéos" }]
            },
            { category: "🤝 Collaboration du Staff", features: [
              { icon: <Mic />, text: "Communication vocale intégrée en direct" },
              { icon: <Bell />, text: "Notifications et assignations de tâches" },
              { icon: <Settings />, text: "Gestion des rôles (Coach, Analyste, Scout)" },
              { icon: <Lock />, text: "Sécurité et confidentialité des données" }]
            }
          ].map((section, index) => (
            <Card key={index} className="p-6 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{section.category}</h3>
              <div className="space-y-4 flex-grow">
                {section.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg text-green-700 mt-1">
                      {feature.icon}
                    </div>
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
      // ENHANCEMENT: More emotional and aspirational title
      title: 'Un Investissement pour la Gloire et l\'Avenir',
      subtitle: 'Des résultats concrets sur le terrain, dans vos opérations et pour vos finances.',
      content: (
         <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Trophy className="h-12 w-12 text-yellow-600" />,
                title: "Avantage Sportif",
                desc: "Gagnez plus de matchs grâce à une meilleure préparation tactique et une analyse fine des adversaires.",
                color: "from-yellow-500/10 to-amber-500/10",
                borderColor: "border-yellow-300"
              },
              {
                icon: <TrendingUp className="h-12 w-12 text-green-600" />,
                title: "Valorisation des Talents",
                desc: "Détectez, formez et suivez vos jeunes joueurs pour construire l'équipe de demain et créer de la valeur.",
                color: "from-green-500/10 to-emerald-500/10",
                borderColor: "border-green-300"
              },
              {
                icon: <Clock className="h-12 w-12 text-blue-600" />,
                title: "Gain de Temps et d'Efficacité",
                desc: "Automatisez les tâches chronophages et libérez votre staff pour qu'il se concentre sur l'essentiel : le football.",
                color: "from-blue-500/10 to-indigo-500/10",
                borderColor: "border-blue-300"
              }
            ].map((benefit, index) => (
              <Card key={index} className={`bg-gradient-to-br ${benefit.color} border ${benefit.borderColor} rounded-2xl hover:shadow-xl transition-all duration-300 text-center`}>
                <CardHeader className="pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">
                    {benefit.icon}
                  </div>
                  <CardTitle className="text-2xl text-slate-900">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <p className="text-slate-600 text-lg">{benefit.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
      )
    },


    // Slide 6: Pricing & Packages
    {
      id: 'pricing',
      title: 'Des Offres Adaptées à Votre Ambition',
      subtitle: 'Que vous soyez un centre de formation ou un club visant le titre, nous avons la solution.',
      content: (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                // ENHANCEMENT: Localized plan names
                name: "Pack Académie",
                price: "Sur Demande",
                period: "",
                description: "L'essentiel pour la formation et le suivi des équipes de jeunes.",
                icon: <School className="h-6 w-6 text-blue-600" />,
                features: [
                  "Analyse jusqu'à 5 matchs/mois",
                  "2 utilisateurs (analystes/coachs)",
                  "Statistiques fondamentales",
                  "Suivi de la progression des joueurs",
                  "Support par email & WhatsApp"
                ],
                cardStyle: "bg-white border-slate-200",
                buttonStyle: "bg-slate-900 hover:bg-slate-800",
                buttonText: "Demander un Devis"
              },
              {
                name: "Pack Ligue Pro",
                price: "Sur Demande",
                period: "",
                description: "La solution complète pour les clubs professionnels visant la performance.",
                icon: <Trophy className="h-6 w-6 text-green-600" />,
                features: [
                  "Matchs & Analystes illimités",
                  "Analyse vidéo avancée",
                  "Communication vocale en direct",
                  "Scouting & Analyse adversaires",
                  "Support prioritaire 24/7",
                  "Formation de votre staff"
                ],
                popular: true,
                cardStyle: "bg-gradient-to-br from-green-50 to-blue-50 border-green-300 shadow-2xl scale-105",
                buttonStyle: "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700",
                buttonText: "Demander un Devis"
              },
              {
                name: "Pack Fédération",
                price: "Partenariat",
                period: "",
                description: "Une solution sur-mesure pour les fédérations et directions techniques nationales.",
                icon: <Flag className="h-6 w-6 text-red-600" />,
                features: [
                  "Déploiement national",
                  "Base de données centralisée des talents",
                  "Infrastructure dédiée et sécurisée",
                  "Développement de fonctionnalités spécifiques",
                  "Accompagnement stratégique"
                ],
                cardStyle: "bg-white border-slate-200",
                buttonStyle: "bg-red-700 hover:bg-red-800",
                buttonText: "Nous Contacter"
              }
            ].map((plan, index) => (
              <Card key={index} className={`${plan.cardStyle} transition-all duration-300 rounded-2xl overflow-hidden flex flex-col`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 shadow-lg">
                      Le Plus Populaire
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl text-slate-900 mb-3">{plan.name}</CardTitle>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-slate-600 px-4 h-16">{plan.description}</p>
                </CardHeader>
                <CardContent className="px-8 pb-8 flex flex-col flex-grow">
                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.buttonStyle} shadow-lg hover:shadow-xl transition-all duration-300 py-3 mt-auto`}>
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* ENHANCEMENT: Note on currency to show flexibility */}
          <p className="text-center text-slate-500 italic">Devis fournis en Dinar Algérien (DZD) ou en Euro (€) selon votre préférence.</p>
        </div>
      )
    },
    
    // Slide 7: Implementation & Support
    {
      id: 'implementation',
      // ENHANCEMENT: Reassuring title
      title: 'Votre Partenaire de la Signature au Succès',
      subtitle: 'Nous ne sommes pas juste un fournisseur. Nous sommes un membre de votre équipe.',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">Notre Processus d'Intégration</h3>
            <div className="space-y-6">
              {[
                { step: "1", title: "Audit & Personnalisation", desc: "Nous étudions vos besoins pour configurer la plateforme pour VOUS.", duration: "1-2 jours" },
                { step: "2", title: "Formation du Staff", desc: "Formation pratique et sur-mesure pour vos coachs et analystes (sur site ou à distance).", duration: "2-3 jours" },
                { step: "3", title: "Lancement & Suivi", desc: "Nous vous accompagnons lors de vos premiers matchs pour garantir une prise en main parfaite.", duration: "Continu" }
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
            <h3 className="text-3xl font-bold text-slate-900">Un Support Qui Parle Votre Langue</h3>
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-4 mb-4"><Headphones className="h-8 w-8 text-blue-600" /><h4 className="text-xl font-bold text-slate-900">Support Technique Dédié</h4></div>
                {/* ENHANCEMENT: Crucial localization point */}
                <ul className="space-y-2 text-slate-700 list-disc list-inside">
                  <li><strong>Support en Français et Arabe</strong></li>
                  <li>Disponible via WhatsApp, téléphone et email</li>
                  <li>Un interlocuteur unique pour votre club</li>
                </ul>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-4 mb-4"><Lightbulb className="h-8 w-8 text-green-600" /><h4 className="text-xl font-bold text-slate-900">Innovation Continue</h4></div>
                <ul className="space-y-2 text-slate-700 list-disc list-inside">
                  <li>Mises à jour régulières basées sur vos retours</li>
                  <li>Accès aux nouvelles fonctionnalités en avant-première</li>
                  <li>Une plateforme qui évolue avec le football moderne</li>
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
      // ENHANCEMENT: Action-oriented title
      title: 'Prêt à Donner une Nouvelle Dimension à Votre Club ?',
      subtitle: 'Rejoignez l\'élite des clubs qui ont choisi de ne plus laisser la victoire au hasard.',
      content: (
        <div className="text-center space-y-12">
          <div className="space-y-8">
             <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 text-white shadow-2xl">
              <h3 className="text-4xl font-bold mb-6">Demandez Votre Démonstration Personnalisée</h3>
              <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
                Voyez par vous-même comment FootballAnalytics Pro peut s'adapter à la réalité de votre club. C'est gratuit et sans engagement.
              </p>
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 text-xl px-12 py-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <Calendar className="mr-3 h-6 w-6" />
                Je Veux Ma Démo Gratuite
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">Contact Direct Algérie</h4>
              {/* ENHANCEMENT: Localized contact info */}
              <div className="space-y-3 text-left text-lg">
                <p className="text-slate-700 flex items-center gap-2"><strong>WhatsApp/Tél:</strong> +213 (0)X XX XX XX XX</p>
                <p className="text-slate-700 flex items-center gap-2"><strong>Email:</strong> contact.algerie@footballanalytics.pro</p>
                <p className="text-slate-700 flex items-center gap-2"><strong>Disponibilité:</strong> 7j/7 pour les clubs partenaires</p>
              </div>
            </Card>
            
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">Prochaines Étapes</h4>
              <div className="space-y-3 text-left text-lg">
                <p className="text-slate-700 flex items-start gap-2"><ArrowRight className="text-green-500 mt-1 h-5 w-5"/> Démo personnalisée de 30 minutes</p>
                <p className="text-slate-700 flex items-start gap-2"><ArrowRight className="text-green-500 mt-1 h-5 w-5"/> Proposition commerciale sur-mesure</p>
                <p className="text-slate-700 flex items-start gap-2"><ArrowRight className="text-green-500 mt-1 h-5 w-5"/> Période d'essai pour votre staff</p>
              </div>
            </Card>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    // ENHANCEMENT: Adjusted background gradient to include green
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-50">
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          {/* ENHANCEMENT: Using Trophy icon in header */}
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">FootballAnalytics Pro</span>
        </div>
        
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <span className="text-sm text-slate-600">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>

      <div className="pt-24 pb-20 px-4 sm:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              {slides[currentSlide].title}
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 max-w-4xl mx-auto">
              {slides[currentSlide].subtitle}
            </p>
          </div>
          
          <div className="min-h-[600px] flex items-center justify-center">
            <div className="w-full">
                {slides[currentSlide].content}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full px-6 py-4 shadow-xl">
          <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentSlide === 0} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide 
                    ? 'bg-green-600 scale-125' 
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          
          <Button variant="outline" size="sm" onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessPresentation;