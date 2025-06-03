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
  Share2, // Added for new features
  Lightbulb, // Added for new benefits
  Building, // Added for target audience
  School // Added for target audience
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Target className="h-8 w-8 text-red-600" />,
      title: "Enregistrement d'Événements en Direct et Précis",
      description: "Saisissez chaque action avec notre interface de 'piano' optimisée, suivi de la position du ballon, et collaboration multi-opérateurs en temps réel."
    },
    {
      icon: <Video className="h-8 w-8 text-blue-600" />,
      title: "Analyse Vidéo Intégrée et Synchronisée",
      description: "Liez les données d'événements aux séquences vidéo (y compris YouTube) pour des revues tactiques approfondies et une compréhension visuelle."
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Gestion Complète des Équipes et Joueurs",
      description: "Administrez vos effectifs, profils de joueurs, formations tactiques et assignations de rôles avec une flexibilité totale."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Analyses et Visualisations Puissantes",
      description: "Tableaux de bord KPI, cartes de chaleur, graphiques radar, statistiques détaillées et analyse tactique pour une performance optimale."
    },
    {
      icon: <Share2 className="h-8 w-8 text-indigo-600" />,
      title: "Collaboration d'Équipe Optimisée",
      description: "Permettez à plusieurs analystes de travailler simultanément avec assignations spécialisées, synchronisation en temps réel et outils de communication."
    },
    {
      icon: <Shield className="h-8 w-8 text-orange-600" />,
      title: "Administration et Contrôle Avancés",
      description: "Gérez les utilisateurs avec des rôles précis, suivez l'activité des trackers (absences, batterie), et accédez à des journaux d'audit complets."
    }
  ];

  const benefits = [
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
      title: "Performance Améliorée",
      description: "Identifiez les points forts, faibles, et tendances pour optimiser les stratégies et performances de l'équipe."
    },
    {
      icon: <Timer className="h-6 w-6 text-green-500" />,
      title: "Analyse en Temps Réel & Collaborative",
      description: "Suivez et enregistrez les événements en direct avec plusieurs analystes, recevez des notifications et communiquez efficacement."
    },
    {
      icon: <Zap className="h-6 w-6 text-purple-500" />,
      title: "Efficacité Opérationnelle",
      description: "Optimisez les workflows d'analyse grâce aux outils administratifs, assignations spécialisées et gestion des trackers."
    },
    {
      icon: <Lightbulb className="h-6 w-6 text-red-500" />,
      title: "Prise de Décision Éclairée",
      description: "Basez vos décisions tactiques et de développement sur des données précises, des analyses vidéo et des rapports complets."
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
      popular: false
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
      popular: true
    },
    {
      name: "Enterprise",
      price: "Sur devis",
      period: "",
      description: "Solution complète pour les clubs professionnels et fédérations",
      icon: <Shield className="h-6 w-6 text-green-600" />,
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
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">FootballAnalytics Pro</h1>
          </div>
          <Button onClick={() => navigate('/auth')} className="bg-blue-600 hover:bg-blue-700">
            Se Connecter
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
            Plateforme d'Analyse et Gestion Football Professionnelle
          </Badge>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Révolutionnez Votre
            <span className="text-blue-600 block">Analyse et Gestion de Match</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Une plateforme tout-en-un pour l'enregistrement détaillé, l'analyse vidéo poussée, la collaboration en temps réel et la gestion complète des données de match de football. Transformez vos analyses en avantage concurrentiel.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Commencer Maintenant
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 border-blue-200 hover:bg-blue-50"
            >
              <Eye className="mr-2 h-5 w-5" />
              Voir la Démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nos Fonctionnalités Clés Professionnelles
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez comment notre plateforme transforme l'analyse et la gestion football avec des outils de pointe.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 p-3 bg-gray-50 rounded-lg w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Notre Modèle Économique Flexible
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Des solutions adaptées à chaque niveau, du club amateur aux organisations professionnelles.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative hover:shadow-lg transition-shadow ${plan.popular ? 'border-2 border-purple-500 shadow-lg' : 'border-0 shadow-md'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-500 text-white px-4 py-1">
                      Le Plus Populaire
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-gray-50 rounded-lg w-fit">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl text-gray-900 mb-2">{plan.name}</CardTitle>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-1" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    onClick={() => navigate('/auth')}
                  >
                    {plan.price === "Sur devis" ? "Nous Contacter" : "Commencer"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Pourquoi Choisir Notre Modèle ?</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Sans Engagement</h4>
                <p className="text-sm text-gray-600">Résiliez à tout moment sans frais cachés</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Support Inclus</h4>
                <p className="text-sm text-gray-600">Formation et assistance technique comprise</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Mises à Jour</h4>
                <p className="text-sm text-gray-600">Nouvelles fonctionnalités automatiques</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Database className="h-6 w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Vos Données</h4>
                <p className="text-sm text-gray-600">Export libre de toutes vos analyses</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-50 to-green-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Les Avantages Stratégiques de Notre Plateforme
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez les bénéfices concrets qui font la différence pour votre équipe et votre organisation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4 p-6 bg-white rounded-lg shadow-sm">
                <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Une Solution Adaptée à Tous les Acteurs du Football
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Entraîneurs & Staff</h3>
              <p className="text-gray-600">
                Optimisez les stratégies, analysez les performances d'équipe et individuelles, et préparez les matchs efficacement.
              </p>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analystes Données & Vidéo</h3>
              <p className="text-gray-600">
                Exploitez des outils pointus pour l'enregistrement, l'analyse vidéo synchronisée, et la génération de rapports.
              </p>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Clubs & Organisations</h3>
              <p className="text-gray-600">
                Gérez plusieurs équipes, centralisez les données, coordonnez les analystes et structurez vos opérations d'analyse.
              </p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <School className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Éducation & Recherche</h3>
              <p className="text-gray-600">
                Utilisez notre plateforme comme outil pédagogique pour la science du sport ou pour mener des recherches avancées.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Technologies de Pointe
          </h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Notre plateforme utilise les dernières technologies web pour offrir une expérience utilisateur exceptionnelle, robuste et sécurisée.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "React", description: "Interface dynamique" },
              { name: "TypeScript", description: "Code fiable" },
              { name: "Supabase", description: "Backend & BDD scalable" },
              { name: "Tailwind CSS", description: "Design moderne" }
            ].map((tech, index) => (
              <div key={index} className="p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{tech.name}</h4>
                <p className="text-sm text-gray-600">{tech.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à Transformer Votre Analyse et Gestion de Match ?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez les entraîneurs, analystes et clubs qui optimisent leurs performances avec notre plateforme.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8"
            >
              <UserCheck className="mr-2 h-5 w-5" />
              Créer un Compte
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-white border-white hover:bg-white hover:text-blue-600 text-lg px-8"
            >
              Nous Contacter
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold">FootballAnalytics Pro</h3>
              </div>
              <p className="text-gray-400">
                La plateforme de référence pour l'analyse et la gestion professionnelle de matchs de football.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Services Clés</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Analyse Vidéo & Données</li>
                <li>Collaboration en Temps Réel</li>
                <li>Gestion d'Équipes & Joueurs</li>
                <li>Outils Administratifs</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>Tutoriels Vidéo</li>
                <li>Support Client Réactif</li>
                <li>Formations Personnalisées</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>contact@footballanalytics.pro</li>
                <li>+33 1 23 45 67 89</li>
                <li>Paris, France</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} FootballAnalytics Pro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;