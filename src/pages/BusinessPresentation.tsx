
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Video, 
  Timer, 
  Target, 
  Shield, 
  Zap, 
  Eye, 
  TrendingUp,
  PlayCircle,
  UserCheck,
  Database,
  Smartphone,
  Globe,
  Check,
  Crown,
  Star,
  Share2,
  Lightbulb,
  Building,
  School,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Activity,
  Mic,
  Calendar,
  Bell,
  FileText,
  PieChart,
  Map,
  LineChart,
  Camera,
  Clock,
  MessageSquare,
  Headphones,
  Radar,
  Hash,
  BarChart,
  TrendingDown,
  Award,
  Settings,
  Lock
} from 'lucide-react';

const BusinessPresentation: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Title
    {
      id: 'title',
      title: 'FootballAnalytics Pro',
      subtitle: 'La Solution Complète d\'Analyse et Gestion de Match',
      content: (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <BarChart3 className="h-16 w-16 text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              FootballAnalytics Pro
            </h1>
            <p className="text-2xl text-slate-600 max-w-4xl mx-auto">
              Transformez votre analyse football avec notre plateforme tout-en-un pour l'enregistrement précis, 
              l'analyse vidéo synchronisée et la collaboration en temps réel.
            </p>
            <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 px-8 py-3 text-lg">
              Présentation Business & Fonctionnelle
            </Badge>
          </div>
        </div>
      )
    },

    // Slide 2: Problem Statement
    {
      id: 'problem',
      title: 'Les Défis Actuels des Clubs de Football',
      subtitle: 'Pourquoi avez-vous besoin d\'une solution moderne ?',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900 mb-6">Problèmes Identifiés</h3>
            {[
              { 
                icon: <FileText className="h-8 w-8 text-red-500" />, 
                title: "Analyse Manuelle Chronophage", 
                desc: "Heures passées à analyser manuellement les matchs avec des outils obsolètes" 
              },
              { 
                icon: <Database className="h-8 w-8 text-orange-500" />, 
                title: "Données Fragmentées", 
                desc: "Informations dispersées dans plusieurs systèmes non intégrés" 
              },
              { 
                icon: <Users className="h-8 w-8 text-yellow-500" />, 
                title: "Collaboration Limitée", 
                desc: "Difficultés de coordination entre analystes et staff technique" 
              },
              { 
                icon: <Video className="h-8 w-8 text-blue-500" />, 
                title: "Analyse Vidéo Non Synchronisée", 
                desc: "Pas de lien direct entre données événementielles et séquences vidéo" 
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
            <h3 className="text-3xl font-bold text-slate-900 mb-6">Impact sur Performance</h3>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border border-red-200">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-red-600 mb-2">-40%</div>
                  <p className="text-lg text-slate-700">Efficacité d'analyse réduite</p>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-orange-600 mb-2">+200%</div>
                  <p className="text-lg text-slate-700">Temps requis pour les rapports</p>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-yellow-600 mb-2">70%</div>
                  <p className="text-lg text-slate-700">Des insights perdus par manque d'outils</p>
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
      title: 'Notre Solution : FootballAnalytics Pro',
      subtitle: 'Une plateforme unifiée qui révolutionne l\'analyse football',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-12 w-12 text-blue-600" />,
                title: "Enregistrement Précis",
                desc: "Interface piano optimisée pour un tracking d'événements en temps réel ultra-précis",
                gradient: "from-blue-500/10 to-indigo-500/10"
              },
              {
                icon: <Video className="h-12 w-12 text-indigo-600" />,
                title: "Analyse Vidéo Synchronisée",
                desc: "Liaison automatique entre données et séquences vidéo pour des insights visuels",
                gradient: "from-indigo-500/10 to-purple-500/10"
              },
              {
                icon: <Share2 className="h-12 w-12 text-purple-600" />,
                title: "Collaboration Temps Réel",
                desc: "Multiple analystes travaillent simultanément avec communication vocale intégrée",
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
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">Résultat : Une Performance d'Équipe Optimisée</h3>
            <p className="text-xl opacity-90 max-w-4xl mx-auto">
              Prenez des décisions tactiques éclairées basées sur des données précises, 
              améliorez la préparation des matchs et maximisez le potentiel de vos joueurs.
            </p>
          </div>
        </div>
      )
    },

    // Slide 4: Core Features
    {
      id: 'features',
      title: 'Fonctionnalités Clés de la Plateforme',
      subtitle: 'Tout ce dont votre club a besoin en une seule solution',
      content: (
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              category: "📊 Analyse & Suivi",
              features: [
                { icon: <Timer />, text: "Enregistrement d'événements en temps réel avec interface piano" },
                { icon: <Map />, text: "Suivi de position du ballon et des joueurs sur le terrain" },
                { icon: <BarChart />, text: "Statistiques avancées et KPIs personnalisés" },
                { icon: <LineChart />, text: "Graphiques radar et cartes de chaleur" }
              ]
            },
            {
              category: "🎥 Vidéo & Visualisation",
              features: [
                { icon: <Video />, text: "Analyse vidéo synchronisée avec les données" },
                { icon: <Camera />, text: "Intégration YouTube et sources vidéo multiples" },
                { icon: <Eye />, text: "Revue tactique avec annotations et marquages" },
                { icon: <PlayCircle />, text: "Playlists d'événements pour formation" }
              ]
            },
            {
              category: "👥 Collaboration & Gestion",
              features: [
                { icon: <Users />, text: "Gestion complète des équipes et joueurs" },
                { icon: <Mic />, text: "Communication vocale en temps réel" },
                { icon: <Bell />, text: "Système de notifications et assignations" },
                { icon: <Settings />, text: "Rôles et permissions personnalisables" }
              ]
            },
            {
              category: "📈 Rapports & Analytics",
              features: [
                { icon: <PieChart />, text: "Tableaux de bord KPI en temps réel" },
                { icon: <FileText />, text: "Rapports détaillés automatisés" },
                { icon: <TrendingUp />, text: "Analyse comparative des performances" },
                { icon: <Database />, text: "Export de données et intégrations API" }
              ]
            }
          ].map((section, index) => (
            <Card key={index} className="p-6 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{section.category}</h3>
              <div className="space-y-4">
                {section.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
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
      title: 'Avantages Business pour Votre Club',
      subtitle: 'ROI mesurable et amélioration des performances',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Trophy className="h-12 w-12 text-gold-600" />,
                title: "Performance Sportive",
                metrics: [
                  { value: "+25%", desc: "Amélioration des performances tactiques" },
                  { value: "+40%", desc: "Précision dans l'analyse des adversaires" },
                  { value: "-30%", desc: "Réduction des erreurs tactiques" }
                ],
                color: "from-yellow-500/10 to-amber-500/10"
              },
              {
                icon: <Clock className="h-12 w-12 text-green-600" />,
                title: "Efficacité Opérationnelle",
                metrics: [
                  { value: "75%", desc: "Réduction du temps d'analyse" },
                  { value: "3x", desc: "Plus rapide pour les rapports" },
                  { value: "90%", desc: "Automatisation des tâches répétitives" }
                ],
                color: "from-green-500/10 to-emerald-500/10"
              },
              {
                icon: <TrendingUp className="h-12 w-12 text-blue-600" />,
                title: "Retour sur Investissement",
                metrics: [
                  { value: "300%", desc: "ROI moyen sur 12 mois" },
                  { value: "-60%", desc: "Réduction des coûts d'analyse" },
                  { value: "+200%", desc: "Augmentation de la productivité" }
                ],
                color: "from-blue-500/10 to-indigo-500/10"
              }
            ].map((benefit, index) => (
              <Card key={index} className={`bg-gradient-to-br ${benefit.color} border border-slate-200/50 rounded-2xl hover:shadow-xl transition-all duration-300`}>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">
                    {benefit.icon}
                  </div>
                  <CardTitle className="text-xl text-slate-900">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <div className="space-y-4">
                    {benefit.metrics.map((metric, metricIndex) => (
                      <div key={metricIndex} className="text-center">
                        <div className="text-3xl font-bold text-slate-900 mb-1">{metric.value}</div>
                        <div className="text-sm text-slate-600">{metric.desc}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-4">Cas d'Usage Réels</h3>
                <ul className="space-y-3 text-lg">
                  <li className="flex items-center gap-3">
                    <Check className="h-6 w-6 text-green-400" />
                    Préparation tactique d'avant-match optimisée
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-6 w-6 text-green-400" />
                    Analyse post-match accélérée et détaillée
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-6 w-6 text-green-400" />
                    Formation des joueurs basée sur données
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-6 w-6 text-green-400" />
                    Scouting et analyse des adversaires
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <div className="text-6xl font-bold text-green-400 mb-2">15+</div>
                <p className="text-xl">Clubs partenaires déjà satisfaits</p>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 6: Technology & Innovation
    {
      id: 'technology',
      title: 'Innovation Technologique',
      subtitle: 'Des technologies de pointe pour des résultats exceptionnels',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-slate-900">Architecture Moderne</h3>
              <div className="space-y-6">
                {[
                  { icon: <Globe />, title: "Cloud-Native", desc: "Accès partout, synchronisation automatique" },
                  { icon: <Shield />, title: "Sécurité Enterprise", desc: "Données protégées, conformité RGPD" },
                  { icon: <Zap />, title: "Performance Optimale", desc: "Temps de réponse ultra-rapides" },
                  { icon: <Smartphone />, title: "Multi-Plateforme", desc: "Web, mobile, extension Chrome" }
                ].map((tech, index) => (
                  <div key={index} className="flex gap-4 p-6 bg-white rounded-xl shadow-lg">
                    <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
                      {tech.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-slate-900 mb-2">{tech.title}</h4>
                      <p className="text-slate-600">{tech.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-slate-900">Fonctionnalités Avancées</h3>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-200">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-lg">
                      <Mic className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">Communication Vocale Intégrée</h4>
                      <p className="text-slate-600">Coordination en temps réel entre analystes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-lg">
                      <Activity className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">Interface Piano Révolutionnaire</h4>
                      <p className="text-slate-600">Saisie d'événements ultra-rapide et précise</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-600 rounded-lg">
                      <Bell className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">Notifications Intelligentes</h4>
                      <p className="text-slate-600">Assignations automatiques et remplacements</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 7: Pricing & Packages
    {
      id: 'pricing',
      title: 'Offres & Tarification',
      subtitle: 'Des solutions adaptées à chaque type de club',
      content: (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Club Amateur",
                price: "99€",
                period: "/mois",
                description: "Idéal pour les clubs amateurs et équipes jeunes",
                icon: <Star className="h-6 w-6 text-blue-600" />,
                features: [
                  "Jusqu'à 5 matchs par mois",
                  "2 analystes simultanés",
                  "Statistiques de base",
                  "Support email",
                  "Formation incluse"
                ],
                cardStyle: "bg-white border-slate-200",
                buttonStyle: "bg-slate-900 hover:bg-slate-800"
              },
              {
                name: "Club Semi-Pro",
                price: "299€",
                period: "/mois",
                description: "Pour les clubs semi-professionnels et centres de formation",
                icon: <Crown className="h-6 w-6 text-purple-600" />,
                features: [
                  "Matchs illimités",
                  "10 analystes simultanés",
                  "Analyse vidéo complète",
                  "Statistiques avancées",
                  "Communication vocale",
                  "Support prioritaire",
                  "API d'intégration"
                ],
                popular: true,
                cardStyle: "bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300 shadow-2xl scale-105",
                buttonStyle: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              },
              {
                name: "Club Professionnel",
                price: "Sur mesure",
                period: "",
                description: "Solution enterprise pour clubs professionnels",
                icon: <Shield className="h-6 w-6 text-emerald-600" />,
                features: [
                  "Configuration personnalisée",
                  "Analystes illimités",
                  "Infrastructure dédiée",
                  "SLA garanti",
                  "Formation sur site",
                  "Support 24/7",
                  "Développement sur mesure"
                ],
                cardStyle: "bg-white border-slate-200",
                buttonStyle: "bg-emerald-600 hover:bg-emerald-700"
              }
            ].map((plan, index) => (
              <Card key={index} className={`${plan.cardStyle} transition-all duration-300 rounded-2xl overflow-hidden`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 shadow-lg">
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
                    <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-slate-600 px-4">{plan.description}</p>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.buttonStyle} shadow-lg hover:shadow-xl transition-all duration-300 py-3`}>
                    {plan.price === "Sur mesure" ? "Nous Contacter" : "Démarrer"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    },

    // Slide 8: Implementation & Support
    {
      id: 'implementation',
      title: 'Mise en Œuvre & Accompagnement',
      subtitle: 'Un déploiement réussi avec notre équipe dédiée',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">Processus de Déploiement</h3>
            <div className="space-y-6">
              {[
                { 
                  step: "1", 
                  title: "Analyse des Besoins", 
                  desc: "Évaluation personnalisée de vos processus actuels",
                  duration: "1 semaine"
                },
                { 
                  step: "2", 
                  title: "Configuration Personnalisée", 
                  desc: "Paramétrage selon vos spécifications",
                  duration: "2 semaines"
                },
                { 
                  step: "3", 
                  title: "Formation Équipes", 
                  desc: "Formation complète de vos analystes et staff",
                  duration: "1 semaine"
                },
                { 
                  step: "4", 
                  title: "Déploiement Progressif", 
                  desc: "Mise en production avec accompagnement",
                  duration: "2 semaines"
                }
              ].map((phase, index) => (
                <div key={index} className="flex gap-6 p-6 bg-white rounded-xl shadow-lg border-l-4 border-blue-500">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {phase.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-semibold text-slate-900">{phase.title}</h4>
                      <Badge variant="secondary">{phase.duration}</Badge>
                    </div>
                    <p className="text-slate-600">{phase.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">Support & Services</h3>
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center gap-4 mb-4">
                  <Headphones className="h-8 w-8 text-green-600" />
                  <h4 className="text-xl font-bold text-slate-900">Support Technique 24/7</h4>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li>• Chat en direct et support téléphonique</li>
                  <li>• Résolution garantie sous 4h</li>
                  <li>• Équipe dédiée aux clubs</li>
                </ul>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-4 mb-4">
                  <School className="h-8 w-8 text-blue-600" />
                  <h4 className="text-xl font-bold text-slate-900">Formation Continue</h4>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li>• Sessions de formation régulières</li>
                  <li>• Documentation complète et tutoriels</li>
                  <li>• Webinaires mensuels nouveautés</li>
                </ul>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200">
                <div className="flex items-center gap-4 mb-4">
                  <Lightbulb className="h-8 w-8 text-purple-600" />
                  <h4 className="text-xl font-bold text-slate-900">Innovation Continue</h4>
                </div>
                <ul className="space-y-2 text-slate-700">
                  <li>• Mises à jour automatiques</li>
                  <li>• Nouvelles fonctionnalités mensuelles</li>
                  <li>• Roadmap co-construite avec les clubs</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )
    },

    // Slide 9: Call to Action
    {
      id: 'cta',
      title: 'Prêt à Transformer Votre Club ?',
      subtitle: 'Rejoignez les clubs qui révolutionnent leur analyse football',
      content: (
        <div className="text-center space-y-12">
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white">
              <h3 className="text-4xl font-bold mb-6">Démarrez Votre Transformation Dès Aujourd'hui</h3>
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">14 jours</div>
                  <p className="text-blue-100">Essai gratuit complet</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">0€</div>
                  <p className="text-blue-100">Frais de mise en place</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">24h</div>
                  <p className="text-blue-100">Délai de réponse garanti</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-6 justify-center flex-wrap">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-xl px-12 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <Calendar className="mr-3 h-6 w-6" />
                Planifier une Démo
              </Button>
              <Button variant="outline" size="lg" className="text-xl px-12 py-6 border-slate-300 hover:bg-slate-50 shadow-lg hover:shadow-xl transition-all duration-300">
                <FileText className="mr-3 h-6 w-6" />
                Télécharger la Brochure
              </Button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">Contact Commercial</h4>
              <div className="space-y-3 text-left">
                <p className="text-slate-700"><strong>Email:</strong> commercial@footballanalytics.pro</p>
                <p className="text-slate-700"><strong>Téléphone:</strong> +33 1 23 45 67 89</p>
                <p className="text-slate-700"><strong>Disponibilité:</strong> Lun-Ven 9h-18h</p>
              </div>
            </Card>
            
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">Références Disponibles</h4>
              <div className="space-y-3 text-left">
                <p className="text-slate-700">✓ Cas d'études détaillés</p>
                <p className="text-slate-700">✓ Témoignages de clubs partenaires</p>
                <p className="text-slate-700">✓ Démonstrations personnalisées</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">FootballAnalytics Pro</span>
        </div>
        
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <span className="text-sm text-slate-600">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Slide Content */}
      <div className="pt-20 pb-20 px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              {slides[currentSlide].title}
            </h1>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto">
              {slides[currentSlide].subtitle}
            </p>
          </div>
          
          <div className="min-h-[600px]">
            {slides[currentSlide].content}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-full px-6 py-4 shadow-xl">
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide 
                    ? 'bg-blue-600 scale-125' 
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessPresentation;
