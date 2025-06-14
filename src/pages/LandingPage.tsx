
import React from 'react';
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
  School
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Target className="h-8 w-8 text-red-500" />,
      title: "Enregistrement d'Événements en Direct et Précis",
      description: "Saisissez chaque action avec notre interface de 'piano' optimisée, suivi de la position du ballon, et collaboration multi-opérateurs en temps réel.",
      gradient: "from-red-500/10 to-pink-500/10",
      border: "border-red-200"
    },
    {
      icon: <Video className="h-8 w-8 text-blue-500" />,
      title: "Analyse Vidéo Intégrée et Synchronisée",
      description: "Liez les données d'événements aux séquences vidéo (y compris YouTube) pour des revues tactiques approfondies et une compréhension visuelle.",
      gradient: "from-blue-500/10 to-cyan-500/10",
      border: "border-blue-200"
    },
    {
      icon: <Users className="h-8 w-8 text-emerald-500" />,
      title: "Gestion Complète des Équipes et Joueurs",
      description: "Administrez vos effectifs, profils de joueurs, formations tactiques et assignations de rôles avec une flexibilité totale.",
      gradient: "from-emerald-500/10 to-green-500/10",
      border: "border-emerald-200"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-500" />,
      title: "Analyses et Visualisations Puissantes",
      description: "Tableaux de bord KPI, cartes de chaleur, graphiques radar, statistiques détaillées et analyse tactique pour une performance optimale.",
      gradient: "from-purple-500/10 to-violet-500/10",
      border: "border-purple-200"
    },
    {
      icon: <Share2 className="h-8 w-8 text-indigo-500" />,
      title: "Collaboration d'Équipe Optimisée",
      description: "Permettez à plusieurs analystes de travailler simultanément avec assignations spécialisées, synchronisation en temps réel et outils de communication.",
      gradient: "from-indigo-500/10 to-blue-500/10",
      border: "border-indigo-200"
    },
    {
      icon: <Shield className="h-8 w-8 text-amber-500" />,
      title: "Administration et Contrôle Avancés",
      description: "Gérez les utilisateurs avec des rôles précis, suivez l'activité des trackers (absences, batterie), et accédez à des journaux d'audit complets.",
      gradient: "from-amber-500/10 to-orange-500/10",
      border: "border-amber-200"
    }
  ];

  const benefits = [
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
      title: "Performance Améliorée",
      description: "Identifiez les points forts, faibles, et tendances pour optimiser les stratégies et performances de l'équipe.",
      accent: "bg-blue-50 border-blue-100"
    },
    {
      icon: <Timer className="h-6 w-6 text-emerald-600" />,
      title: "Analyse en Temps Réel & Collaborative",
      description: "Suivez et enregistrez les événements en direct avec plusieurs analystes, recevez des notifications et communiquez efficacement.",
      accent: "bg-emerald-50 border-emerald-100"
    },
    {
      icon: <Zap className="h-6 w-6 text-purple-600" />,
      title: "Efficacité Opérationnelle",
      description: "Optimisez les workflows d'analyse grâce aux outils administratifs, assignations spécialisées et gestion des trackers.",
      accent: "bg-purple-50 border-purple-100"
    },
    {
      icon: <Lightbulb className="h-6 w-6 text-amber-600" />,
      title: "Prise de Décision Éclairée",
      description: "Basez vos décisions tactiques et de développement sur des données précises, des analyses vidéo et des rapports complets.",
      accent: "bg-amber-50 border-amber-100"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "99€",
      period: "/mois",
      description: "Parfait pour les petits clubs et équipes amateur",
      icon: <Star className="h-6 w-6 text-blue-600" />,
      features: [
        "Jusqu'à 5 matchs par mois",
        "2 analystes simultanés",
        "Statistiques de base et suivi d'événements",
        "Gestion d'équipe de base",
        "Support par email",
        "Stockage 10GB"
      ],
      popular: false,
      cardStyle: "bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg",
      buttonStyle: "bg-slate-900 hover:bg-slate-800"
    },
    {
      name: "Professional",
      price: "299€",
      period: "/mois",
      description: "Idéal pour les clubs semi-professionnels et académies",
      icon: <Crown className="h-6 w-6 text-purple-600" />,
      features: [
        "Matchs illimités",
        "10 analystes simultanés",
        "Statistiques avancées et visualisations (heatmaps, radar)",
        "Analyse vidéo complète avec synchronisation",
        "Gestion d'équipe et formations tactiques",
        "Collaboration multi-utilisateurs",
        "Support prioritaire",
        "Stockage 100GB",
        "API d'intégration"
      ],
      popular: true,
      cardStyle: "bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300 shadow-xl scale-105 relative",
      buttonStyle: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
    },
    {
      name: "Enterprise",
      price: "Sur devis",
      period: "",
      description: "Solution complète pour les clubs professionnels et fédérations",
      icon: <Shield className="h-6 w-6 text-emerald-600" />,
      features: [
        "Tout du plan Professional",
        "Analystes illimités et rôles personnalisés",
        "Fonctionnalités de collaboration avancées (voice, etc.)",
        "Administration complète (audit, gestion des trackers)",
        "Infrastructure dédiée et SLA",
        "Formation personnalisée et support 24/7",
        "Stockage illimité",
        "Développement sur mesure"
      ],
      popular: false,
      cardStyle: "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg",
      buttonStyle: "bg-emerald-600 hover:bg-emerald-700"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              FootballAnalytics Pro
            </h1>
          </div>
          <Button 
            onClick={() => navigate('/auth')} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Se Connecter
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
        <div className="container mx-auto text-center max-w-5xl relative">
          <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 px-6 py-2 text-sm font-medium">
            Plateforme d'Analyse et Gestion Football Professionnelle
          </Badge>
          <h1 className="text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
              Révolutionnez Votre
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Analyse et Gestion de Match
            </span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            Une plateforme tout-en-un pour l'enregistrement détaillé, l'analyse vidéo poussée, la collaboration en temps réel et la gestion complète des données de match de football. Transformez vos analyses en avantage concurrentiel.
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-10 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <PlayCircle className="mr-3 h-6 w-6" />
              Commencer Maintenant
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-10 py-4 border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Eye className="mr-3 h-6 w-6" />
              Voir la Démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Nos Fonctionnalités Clés Professionnelles
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Découvrez comment notre plateforme transforme l'analyse et la gestion football avec des outils de pointe.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`${feature.border} hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm`}>
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-slate-900 leading-tight">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-center leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-blue-50/50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Notre Modèle Économique Flexible
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Des solutions adaptées à chaque niveau, du club amateur aux organisations professionnelles.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`${plan.cardStyle} transition-all duration-300 transform hover:scale-105`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 shadow-lg">
                      Le Plus Populaire
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl text-slate-900 mb-3">{plan.name}</CardTitle>
                  <div className="mb-3">
                    <span className="text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                    <span className="text-slate-600 text-lg">{plan.period}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.buttonStyle} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 py-3`}
                    onClick={() => navigate('/auth')}
                  >
                    {plan.price === "Sur devis" ? "Nous Contacter" : "Commencer"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <h3 className="text-3xl font-bold mb-8">
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Pourquoi Choisir Notre Modèle ?
              </span>
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Shield, title: "Sans Engagement", desc: "Résiliez à tout moment sans frais cachés", color: "blue" },
                { icon: Users, title: "Support Inclus", desc: "Formation et assistance technique comprise", color: "emerald" },
                { icon: Zap, title: "Mises à Jour", desc: "Nouvelles fonctionnalités automatiques", color: "purple" },
                { icon: Database, title: "Vos Données", desc: "Export libre de toutes vos analyses", color: "amber" }
              ].map((item, index) => (
                <div key={index} className="text-center group">
                  <div className={`w-16 h-16 bg-gradient-to-br from-${item.color}-100 to-${item.color}-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110`}>
                    <item.icon className={`h-8 w-8 text-${item.color}-600`} />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2 text-lg">{item.title}</h4>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Les Avantages Stratégiques de Notre Plateforme
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Découvrez les bénéfices concrets qui font la différence pour votre équipe et votre organisation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className={`flex gap-6 p-8 ${benefit.accent} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border backdrop-blur-sm`}>
                <div className="flex-shrink-0 p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-md">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3 leading-tight">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-indigo-50/50">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-bold mb-16">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Une Solution Adaptée à Tous les Acteurs du Football
            </span>
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: "Entraîneurs & Staff", desc: "Optimisez les stratégies, analysez les performances d'équipe et individuelles, et préparez les matchs efficacement.", color: "blue" },
              { icon: BarChart3, title: "Analystes Données & Vidéo", desc: "Exploitez des outils pointus pour l'enregistrement, l'analyse vidéo synchronisée, et la génération de rapports.", color: "emerald" },
              { icon: Building, title: "Clubs & Organisations", desc: "Gérez plusieurs équipes, centralisez les données, coordonnez les analystes et structurez vos opérations d'analyse.", color: "purple" },
              { icon: School, title: "Éducation & Recherche", desc: "Utilisez notre plateforme comme outil pédagogique pour la science du sport ou pour mener des recherches avancées.", color: "amber" }
            ].map((item, index) => (
              <div key={index} className="p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-slate-200">
                <div className={`w-20 h-20 bg-gradient-to-br from-${item.color}-100 to-${item.color}-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                  <item.icon className={`h-10 w-10 text-${item.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4 leading-tight">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-4xl font-bold mb-8">
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Technologies de Pointe
            </span>
          </h2>
          <p className="text-xl text-slate-600 mb-16 max-w-3xl mx-auto leading-relaxed">
            Notre plateforme utilise les dernières technologies web pour offrir une expérience utilisateur exceptionnelle, robuste et sécurisée.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "React", description: "Interface dynamique", color: "blue" },
              { name: "TypeScript", description: "Code fiable", color: "indigo" },
              { name: "Supabase", description: "Backend & BDD scalable", color: "emerald" },
              { name: "Tailwind CSS", description: "Design moderne", color: "purple" }
            ].map((tech, index) => (
              <div key={index} className="p-6 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-slate-200">
                <div className={`w-16 h-16 bg-gradient-to-br from-${tech.color}-100 to-${tech.color}-50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md`}>
                  <Zap className={`h-8 w-8 text-${tech.color}-600`} />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2 text-lg">{tech.name}</h4>
                <p className="text-slate-600">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="container mx-auto max-w-5xl text-center relative">
          <h2 className="text-5xl font-bold text-white mb-8 leading-tight">
            Prêt à Transformer Votre Analyse et Gestion de Match ?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Rejoignez les entraîneurs, analystes et clubs qui optimisent leurs performances avec notre plateforme.
          </p>
          <div className="flex gap-6 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-10 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <UserCheck className="mr-3 h-6 w-6" />
              Créer un Compte
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-white border-white/30 hover:bg-white/10 hover:border-white text-lg px-10 py-4 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Nous Contacter
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">FootballAnalytics Pro</h3>
              </div>
              <p className="text-slate-400 leading-relaxed">
                La plateforme de référence pour l'analyse et la gestion professionnelle de matchs de football.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">Services Clés</h4>
              <ul className="space-y-3 text-slate-400">
                <li className="hover:text-white transition-colors cursor-pointer">Analyse Vidéo & Données</li>
                <li className="hover:text-white transition-colors cursor-pointer">Collaboration en Temps Réel</li>
                <li className="hover:text-white transition-colors cursor-pointer">Gestion d'Équipes & Joueurs</li>
                <li className="hover:text-white transition-colors cursor-pointer">Outils Administratifs</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">Support</h4>
              <ul className="space-y-3 text-slate-400">
                <li className="hover:text-white transition-colors cursor-pointer">Documentation</li>
                <li className="hover:text-white transition-colors cursor-pointer">Tutoriels Vidéo</li>
                <li className="hover:text-white transition-colors cursor-pointer">Support Client Réactif</li>
                <li className="hover:text-white transition-colors cursor-pointer">Formations Personnalisées</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-6 text-lg">Contact</h4>
              <ul className="space-y-3 text-slate-400">
                <li className="hover:text-white transition-colors">contact@footballanalytics.pro</li>
                <li className="hover:text-white transition-colors">+33 1 23 45 67 89</li>
                <li className="hover:text-white transition-colors">Paris, France</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>© {new Date().getFullYear()} FootballAnalytics Pro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
