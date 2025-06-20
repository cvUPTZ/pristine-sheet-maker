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
  Award, Settings, Lock, Flag, ArrowLeft
} from 'lucide-react';

// --- IMPORTANT FOR RTL ---
// For the best display, add `dir="rtl"` to your <html> tag or the root component.
// Also, consider using a good Arabic font like 'Tajawal' or 'Cairo' in your CSS:
// body { font-family: 'Tajawal', sans-serif; }
// -------------------------

const BusinessPresentation: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 1: Title
    {
      id: 'title',
      title: 'فوتبول أناليتيكس برو: الربحة تتبنى هنا',
      subtitle: 'سلاحك السري باش تسيطر على الفوت الدزيري',
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
              مد للنادي ديالك أفضلية حاسمة مع المنصة لي ترجع كل ماتش درس في التكتيك.
            </p>
            <Badge className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200 px-8 py-3 text-lg font-semibold">
              عرض تقديمي لنوادي الجزائر
            </Badge>
          </div>
        </div>
      )
    },

    // Slide 2: Problem Statement
    {
      id: 'problem',
      title: 'المشاكل تاع كرة القدم في الجزائر اليوم',
      subtitle: 'العقبات لي تحبس الأداء والتطور ديالك.',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6 text-right">المشاكل الشائعة</h3>
            {[
              { 
                icon: <Timer className="h-8 w-8 text-red-500" />, 
                title: "التحليل باليد: يشد الوقت وفيه غلطات", 
                desc: "ساعات وساعات تضيع في إعادة الماتش، مع خطر تفويت تفاصيل حاسمة." 
              },
              { 
                icon: <Database className="h-8 w-8 text-orange-500" />, 
                title: "البيانات مبعثرة", 
                desc: "الإحصائيات، الفيديوهات، التقارير... كل حاجة في بلاصة. ماكانش رؤية شاملة." 
              },
              { 
                icon: <Users className="h-8 w-8 text-yellow-500" />, 
                title: "صعوبة اكتشاف المواهب", 
                desc: "صعيب تتبع تطور اللاعبين الشبان بموضوعية وتلقى الجواهر القادمة." 
              },
              { 
                icon: <Share2 className="h-8 w-8 text-blue-500" />, 
                title: "غياب التنسيق في الطاقم", 
                desc: "نقص التواصل السلس بين المحلل، المدرب والإدارة." 
              }
            ].map((problem, index) => (
              <div key={index} className="flex gap-4 p-6 bg-white rounded-xl shadow-lg border-r-4 border-red-400">
                <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg">{problem.icon}</div>
                <div className="text-right">
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">{problem.title}</h4>
                  <p className="text-slate-600">{problem.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6 text-right">ثمن عدم التطور</h3>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border border-red-200">
              <div className="space-y-8">
                <div className="text-center">
                  <TrendingDown className="h-16 w-16 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">قرارات متأخرة</p>
                  <p className="text-lg text-slate-600">التعديلات التكتيكية تجي روطار، وتكلفك نقاط ثمينة.</p>
                </div>
                <div className="text-center">
                  <UserCheck className="h-16 w-16 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">مواهب تضيع</p>
                  <p className="text-lg text-slate-600">شبان واعدون لا يتم اكتشافهم أو يضيعون بسبب سوء التقييم.</p>
                </div>
                <div className="text-center">
                  <Clock className="h-16 w-16 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-800">وقت ضائع</p>
                  <p className="text-lg text-slate-600">الطاقم ديالك يضيع وقته في الأوراق أكثر من الميدان.</p>
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
      title: 'من البيانات إلى النصر فوق الميدان',
      subtitle: 'فوتبول أناليتيكس برو يجمع، يحلل، ويبدل نظرتك للعبة.',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="h-12 w-12 text-blue-600" />,
                title: "ما تراطي حتى لقطة",
                desc: "بـ 'بيانو تاكتيك' ديالنا، تسجل كل حدث في الماتش بسرعة ودقة عالية.",
                gradient: "from-blue-500/10 to-indigo-500/10"
              },
              {
                icon: <Video className="h-12 w-12 text-indigo-600" />,
                title: "كل زاوية، كل قرار",
                desc: "اربط فوراً الإحصائيات بالفيديو باش تفهم 'علاش' صرات كل لقطة.",
                gradient: "from-indigo-500/10 to-purple-500/10"
              },
              {
                icon: <Users className="h-12 w-12 text-purple-600" />,
                title: "طاقم فني يد وحدة",
                desc: "المحللين، المدربين، والكشافين... كامل يخدموا مع بعض في نفس الوقت، وين ما كانوا.",
                gradient: "from-purple-500/10 to-violet-500/10"
              }
            ].map((item, index) => (
              <Card key={index} className={`border border-slate-200/50 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${item.gradient} rounded-2xl`}>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{item.icon}</div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8"><p className="text-slate-600 text-center">{item.desc}</p></CardContent>
              </Card>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">النتيجة: قرارات أسرع، أذكى، وانتصارات أكثر.</h3>
            <p className="text-xl opacity-90 max-w-4xl mx-auto">
              حسّن تحضيراتك، طوّر لاعبيك، وافرض أسلوب لعبك على أي خصم.
            </p>
          </div>
        </div>
      )
    },
    
    // Slide 4: Core Features
    {
      id: 'features',
      title: 'ميزات مصممة للانتصار',
      subtitle: 'كل ما يحتاجه طاقمك الفني، مجموع في منصة واحدة وسهلة.',
      content: (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { category: "📊 التحكم التكتيكي", features: [
              { icon: <Timer />, text: "تسجيل الأحداث مباشرة بـ 'بيانو تاكتيك'" },
              { icon: <Map />, text: "خرائط حرارية (Heatmaps) ومواقع" },
              { icon: <BarChart />, text: "إحصائيات متقدمة للاعب والفريق" },
              { icon: <Radar />, text: "ملفات الأداء (Radar Charts)" }]
            },
            { category: "🎥 تحليل فيديو مدمج", features: [
              { icon: <Video />, text: "مزامنة مثالية بين البيانات والفيديو" },
              { icon: <PlayCircle />, text: "إنشاء قوائم تشغيل (ex: كل التمريرات الخاطئة)" },
              { icon: <Eye />, text: "أدوات رسم وشرح على الفيديو" },
              { icon: <Camera />, text: "استيراد سهل (YouTube, ملف محلي...)" }]
            },
            { category: "👥 إدارة وتكوين", features: [
              { icon: <Users />, text: "قاعدة بيانات كاملة (لاعبين، فرق)" },
              { icon: <School />, text: "متابعة تطور المواهب الشابة" },
              { icon: <UserCheck />, text: "كشف المواهب وتحليل الخصوم" },
              { icon: <Share2 />, text: "مشاركة سهلة للتقارير والفيديوهات" }]
            },
            { category: "🤝 تعاون الطاقم الفني", features: [
              { icon: <Mic />, text: "اتصال صوتي مباشر ومدمج" },
              { icon: <Bell />, text: "إشعارات وتعيين مهام" },
              { icon: <Settings />, text: "إدارة الأدوار (مدرب، محلل، كشاف...)" },
              { icon: <Lock />, text: "أمان وسرية البيانات" }]
            }
          ].map((section, index) => (
            <Card key={index} className="p-6 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 text-right">{section.category}</h3>
              <div className="space-y-4 flex-grow">
                {section.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                     <span className="text-slate-700 text-right flex-1">{feature.text}</span>
                    <div className="p-2 bg-green-100 rounded-lg text-green-700 mt-1">{feature.icon}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )
    },

    // Slide 5: Pricing & Packages
    {
      id: 'pricing',
      title: 'عروض على حساب طموحك',
      subtitle: 'سواء كنت مركز تكوين أو نادي يلعب على اللقب، عندنا الحل.',
      content: (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "باقة التكوين",
                price: "حسب الطلب",
                description: "الأساسيات لتكوين ومتابعة فرق الشبان.",
                icon: <School className="h-6 w-6 text-blue-600" />,
                features: [
                  "تحليل حتى 5 ماتشات/الشهر",
                  "2 مستخدمين (محللين/مدربين)",
                  "إحصائيات أساسية",
                  "متابعة تطور اللاعبين",
                  "دعم عبر الإيميل والواتساب"
                ],
                cardStyle: "bg-white border-slate-200", buttonStyle: "bg-slate-900 hover:bg-slate-800", buttonText: "اطلب عرض سعر"
              },
              {
                name: "باقة الاحتراف",
                price: "حسب الطلب",
                description: "الحل الكامل للأندية المحترفة التي تسعى للأداء العالي.",
                icon: <Trophy className="h-6 w-6 text-green-600" />,
                features: [
                  "مباريات ومحللين بلا حدود",
                  "تحليل فيديو متقدم",
                  "اتصال صوتي مباشر",
                  "كشف وتحليل الخصوم",
                  "دعم ذو أولوية 24/7",
                  "تكوين للطاقم الفني"
                ],
                popular: true, cardStyle: "bg-gradient-to-br from-green-50 to-blue-50 border-green-300 shadow-2xl scale-105", buttonStyle: "bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700", buttonText: "اطلب عرض سعر"
              },
              {
                name: "باقة الفيدرالية",
                price: "شراكة",
                description: "حل مصمم خصيصاً للفيدراليات والمديريات الفنية الوطنية.",
                icon: <Flag className="h-6 w-6 text-red-600" />,
                features: [
                  "تطبيق على المستوى الوطني",
                  "قاعدة بيانات مركزية للمواهب",
                  "بنية تحتية مخصصة وآمنة",
                  "تطوير ميزات خاصة",
                  "مرافقة استراتيجية"
                ],
                cardStyle: "bg-white border-slate-200", buttonStyle: "bg-red-700 hover:bg-red-800", buttonText: "اتصل بنا"
              }
            ].map((plan) => (
              <Card key={plan.name} className={`${plan.cardStyle} transition-all duration-300 rounded-2xl overflow-hidden flex flex-col`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 shadow-lg font-semibold">الأكثر طلباً</Badge></div>}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{plan.icon}</div>
                  <CardTitle className="text-2xl font-semibold text-slate-900 mb-3">{plan.name}</CardTitle>
                  <div className="mb-3"><span className="text-4xl font-bold text-slate-900">{plan.price}</span></div>
                  <p className="text-slate-600 px-4 h-16">{plan.description}</p>
                </CardHeader>
                <CardContent className="px-8 pb-8 flex flex-col flex-grow">
                  <ul className="space-y-3 mb-8 flex-grow text-right">
                    {plan.features.map((feature, i) => <li key={i} className="flex items-center justify-end gap-3"><span className="text-slate-700">{feature}</span><Check className="h-5 w-5 text-green-500 flex-shrink-0" /></li>)}
                  </ul>
                  <Button className={`w-full ${plan.buttonStyle} shadow-lg hover:shadow-xl transition-all duration-300 py-3 mt-auto font-bold`}>{plan.buttonText}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-slate-500 italic">عروض الأسعار بالدينار (DZD) أو
