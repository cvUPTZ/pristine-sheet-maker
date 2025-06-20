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
    // Slide 1: Title (Restored)
    {
      id: 'title',
      title: 'فوتبول أناليتيكس برو: الربحة تتبنى هنا',
      subtitle: 'سلاحك السري باش تسيطر على الفوت الدزيري',
      content: (
        <div className="text-center space-y-8">
          <div className="w-32 h-32 bg-gradient-to-br from-green-600 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"><Trophy className="h-16 w-16 text-white" /></div>
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">FootballAnalytics Pro</h1>
            <p className="text-2xl text-slate-600 max-w-4xl mx-auto">مد للنادي ديالك أفضلية حاسمة مع المنصة لي ترجع كل ماتش درس في التكتيك.</p>
            <Badge className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200 px-8 py-3 text-lg font-semibold">عرض تقديمي لنوادي الجزائر</Badge>
          </div>
        </div>
      )
    },

    // Slide 2: Problem Statement (Restored)
    {
      id: 'problem',
      title: 'المشاكل تاع كرة القدم في الجزائر اليوم',
      subtitle: 'العقبات لي تحبس الأداء والتطور ديالك.',
      content: (
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6 text-right">المشاكل الشائعة</h3>
            {[
              { icon: <Timer className="h-8 w-8 text-red-500" />, title: "التحليل باليد: يشد الوقت وفيه غلطات", desc: "ساعات وساعات تضيع في إعادة الماتش، مع خطر تفويت تفاصيل حاسمة." },
              { icon: <Database className="h-8 w-8 text-orange-500" />, title: "البيانات مبعثرة", desc: "الإحصائيات، الفيديوهات، التقارير... كل حاجة في بلاصة. ماكانش رؤية شاملة." },
              { icon: <Users className="h-8 w-8 text-yellow-500" />, title: "صعوبة اكتشاف المواهب", desc: "صعيب تتبع تطور اللاعبين الشبان بموضوعية وتلقى الجواهر القادمة." },
              { icon: <Video className="h-8 w-8 text-blue-500" />, title: "تحليل الفيديو غير متزامن", desc: "ماكانش ربط مباشر بين البيانات ولقطات الفيديو." }
            ].map((problem) => (
              <div key={problem.title} className="flex gap-4 p-6 bg-white rounded-xl shadow-lg border-r-4 border-red-400">
                <div className="flex-shrink-0 p-3 bg-gray-50 rounded-lg">{problem.icon}</div>
                <div className="text-right">
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">{problem.title}</h4>
                  <p className="text-slate-600">{problem.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-slate-900 mb-6 text-right">التأثير على الأداء</h3>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-8 rounded-2xl border border-red-200">
              <div className="space-y-6 text-center">
                <div><div className="text-5xl font-bold text-red-600 mb-2">-40%</div><p className="text-lg text-slate-700">نقص في فعالية التحليل</p></div>
                <div><div className="text-5xl font-bold text-orange-600 mb-2">+200%</div><p className="text-lg text-slate-700">الوقت اللازم للتقارير</p></div>
                <div><div className="text-5xl font-bold text-yellow-600 mb-2">70%</div><p className="text-lg text-slate-700">من الأفكار تضيع بسبب نقص الأدوات</p></div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3: Solution Overview (Restored)
    {
      id: 'solution',
      title: 'الحل ديالنا: فوتبول أناليتيكس برو',
      subtitle: 'منصة موحدة تحدث ثورة في تحليل كرة القدم.',
      content: (
        <div className="space-y-12">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Target className="h-12 w-12 text-blue-600" />, title: "تسجيل دقيق", desc: "واجهة 'بيانو' محسّنة لتتبع الأحداث في الوقت الفعلي بدقة فائقة.", gradient: "from-blue-500/10 to-indigo-500/10" },
              { icon: <Video className="h-12 w-12 text-indigo-600" />, title: "تحليل فيديو متزامن", desc: "ربط تلقائي بين البيانات ولقطات الفيديو للحصول على رؤى بصرية.", gradient: "from-indigo-500/10 to-purple-500/10" },
              { icon: <Share2 className="h-12 w-12 text-purple-600" />, title: "تعاون في الوقت الفعلي", desc: "عدة محللين يعملون في نفس الوقت مع اتصال صوتي مدمج.", gradient: "from-purple-500/10 to-violet-500/10" }
            ].map((item) => (
              <Card key={item.title} className={`border border-slate-200/50 hover:shadow-2xl transition-all duration-300 bg-gradient-to-br ${item.gradient} rounded-2xl`}>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{item.icon}</div>
                  <CardTitle className="text-2xl font-semibold text-slate-900">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-8"><p className="text-slate-600 text-center">{item.desc}</p></CardContent>
              </Card>
            ))}
          </div>
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white text-center">
            <h3 className="text-3xl font-bold mb-4">النتيجة: أداء فريقك يصل للقمة</h3>
            <p className="text-xl opacity-90 max-w-4xl mx-auto">اتخذ قرارات تكتيكية مبنية على بيانات دقيقة، حسّن تحضير المباريات، وحقق أقصى إمكانات لاعبيك.</p>
          </div>
        </div>
      )
    },
    
    // Slide 4: Core Features (Restored)
    {
      id: 'features',
      title: 'الميزات الرئيسية للمنصة',
      subtitle: 'كل ما يحتاجه ناديك في حل واحد.',
      content: (
        <div className="grid md:grid-cols-2 gap-8 text-right">
          {[
            { category: "📊 تحليل ومتابعة", features: [{ icon: <Timer />, text: "تسجيل الأحداث مباشرة بواجهة 'بيانو'" }, { icon: <Map />, text: "تتبع موقع الكرة واللاعبين على الميدان" }, { icon: <BarChart />, text: "إحصائيات متقدمة ومؤشرات أداء مخصصة" }, { icon: <LineChart />, text: "رسوم بيانية رادارية وخرائط حرارية" }] },
            { category: "🎥 فيديو وتصور", features: [{ icon: <Video />, text: "تحليل فيديو متزامن مع البيانات" }, { icon: <Camera />, text: "تكامل مع يوتيوب ومصادر فيديو متعددة" }, { icon: <Eye />, text: "مراجعة تكتيكية مع شروحات وعلامات" }, { icon: <PlayCircle />, text: "قوائم تشغيل للأحداث من أجل التكوين" }] },
            { category: "👥 تعاون وإدارة", features: [{ icon: <Users />, text: "إدارة كاملة للفرق واللاعبين" }, { icon: <Mic />, text: "اتصال صوتي في الوقت الفعلي" }, { icon: <Bell />, text: "نظام إشعارات وتعيين مهام" }, { icon: <Settings />, text: "أدوار وصلاحيات قابلة للتخصيص" }] },
            { category: "📈 تقارير وتحليلات", features: [{ icon: <PieChart />, text: "لوحات مؤشرات أداء حية" }, { icon: <FileText />, text: "تقارير مفصلة تلقائية" }, { icon: <TrendingUp />, text: "تحليل مقارن للأداء" }, { icon: <Database />, text: "تصدير البيانات وتكاملات API" }] }
          ].map((section) => (
            <Card key={section.category} className="p-6 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{section.category}</h3>
              <div className="space-y-4">
                {section.features.map((feature) => (
                  <div key={feature.text} className="flex items-center justify-end gap-3">
                    <span className="text-slate-700">{feature.text}</span>
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{feature.icon}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )
    },

    // RE-ADDED SLIDE: Technology (Translated & Adapted)
    {
      id: 'technology',
      title: 'ابتكار تكنولوجي',
      subtitle: 'تقنيات متطورة لنتائج استثنائية',
      content: (
        <div className="grid md:grid-cols-2 gap-12 text-right">
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">بنية حديثة</h3>
            <div className="space-y-6">
              {[
                { icon: <Globe />, title: "على السحابة (Cloud)", desc: "وصول من أي مكان، مزامنة تلقائية" },
                { icon: <Shield />, title: "أمان عالي المستوى", desc: "بيانات محمية، توافق مع المعايير" },
                { icon: <Zap />, title: "أداء فائق", desc: "أوقات استجابة سريعة جداً" },
                { icon: <Smartphone />, title: "متعددة المنصات", desc: "ويب، موبايل، وإضافة كروم" }
              ].map((tech) => (
                <div key={tech.title} className="flex gap-4 p-6 bg-white rounded-xl shadow-lg">
                  <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">{tech.icon}</div>
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900 mb-2">{tech.title}</h4>
                    <p className="text-slate-600">{tech.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">ميزات متقدمة</h3>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-200 space-y-6">
              {[
                { icon: <Mic className="h-8 w-8 text-white" />, title: "اتصال صوتي مدمج", desc: "تنسيق فوري بين المحللين." },
                { icon: <Activity className="h-8 w-8 text-white" />, title: "واجهة 'بيانو' ثورية", desc: "إدخال بيانات سريع ودقيق جداً." },
                { icon: <Bell className="h-8 w-8 text-white" />, title: "إشعارات ذكية", desc: "تعيين مهام تلقائي وتبديلات." }
              ].map((feature, index) => (
                 <div key={feature.title} className="flex items-center gap-4">
                   <div className={`p-3 rounded-lg ${index === 0 ? 'bg-blue-600' : index === 1 ? 'bg-indigo-600' : 'bg-purple-600'}`}>{feature.icon}</div>
                   <div>
                     <h4 className="text-xl font-bold text-slate-900">{feature.title}</h4>
                     <p className="text-slate-600">{feature.desc}</p>
                   </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      )
    },

    // Slide 6: Pricing (Restored & Adapted)
    {
      id: 'pricing',
      title: 'عروض وأسعار',
      subtitle: 'حلول مناسبة لكل نوع من الأندية.',
      content: (
        <div className="space-y-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "باقة الهواة", price: "حسب الطلب", description: "مثالية لأندية الهواة وفرق الشبان.", icon: <Star className="h-6 w-6 text-blue-600" />, features: ["حتى 5 مباريات في الشهر", "2 محللين في نفس الوقت", "إحصائيات أساسية", "دعم عبر الإيميل"], buttonText: "اطلب عرض سعر" },
              { name: "باقة شبه الاحتراف", price: "حسب الطلب", description: "للأندية شبه المحترفة ومراكز التكوين.", icon: <Crown className="h-6 w-6 text-purple-600" />, features: ["مباريات غير محدودة", "10 محللين في نفس الوقت", "تحليل فيديو كامل", "إحصائيات متقدمة", "اتصال صوتي", "دعم ذو أولوية"], popular: true, buttonText: "اطلب عرض سعر" },
              { name: "باقة الاحتراف", price: "على المقاس", description: "حل متكامل للأندية المحترفة الكبيرة.", icon: <Shield className="h-6 w-6 text-emerald-600" />, features: ["إعدادات مخصصة", "محللين بلا حدود", "بنية تحتية مخصصة", "دعم 24/7", "تطوير حسب الطلب"], buttonText: "اتصل بنا" }
            ].map((plan) => (
              <Card key={plan.name} className={`transition-all duration-300 rounded-2xl overflow-hidden flex flex-col ${plan.popular ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300 shadow-2xl scale-105' : 'bg-white border-slate-200'}`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2"><Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 shadow-lg font-semibold">الأكثر طلباً</Badge></div>}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl w-fit shadow-lg">{plan.icon}</div>
                  <CardTitle className="text-2xl font-semibold text-slate-900 mb-3">{plan.name}</CardTitle>
                  <div className="mb-3"><span className="text-4xl font-bold text-slate-900">{plan.price}</span></div>
                  <p className="text-slate-600 px-4 h-16">{plan.description}</p>
                </CardHeader>
                <CardContent className="px-8 pb-8 flex flex-col flex-grow">
                  <ul className="space-y-3 mb-8 flex-grow text-right">
                    {plan.features.map((feature) => <li key={feature} className="flex items-center justify-end gap-3"><span className="text-slate-700">{feature}</span><Check className="h-5 w-5 text-green-500 flex-shrink-0" /></li>)}
                  </ul>
                  <Button className={`w-full shadow-lg hover:shadow-xl transition-all duration-300 py-3 mt-auto font-bold ${plan.popular ? 'bg-gradient-to-r from-purple-600 to-blue-600' : plan.name === 'باقة الاحتراف' ? 'bg-emerald-600' : 'bg-slate-900'}`}>{plan.buttonText}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
           <p className="text-center text-slate-500 italic">عروض الأسعار بالدينار (DZD) أو الأورو (€)، كيما تحب.</p>
        </div>
      )
    },

    // RE-ADDED SLIDE: Implementation (Translated & Adapted)
    {
      id: 'implementation',
      title: 'التنفيذ والمرافقة',
      subtitle: 'نحن معك من التوقيع إلى النجاح.',
      content: (
        <div className="grid md:grid-cols-2 gap-12 text-right">
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">مسار التنفيذ</h3>
            <div className="space-y-6">
              {[
                { step: "1", title: "تحليل الاحتياجات", desc: "تقييم مخصص لعملياتك الحالية.", duration: "أسبوع" },
                { step: "2", title: "إعداد مخصص", desc: "ضبط الإعدادات حسب متطلباتك.", duration: "أسبوعين" },
                { step: "3", title: "تكوين الفرق", desc: "تكوين كامل للمحللين والطاقم الفني.", duration: "أسبوع" },
                { step: "4", title: "إطلاق تدريجي", desc: "الانطلاق في الإنتاج مع مرافقة مستمرة.", duration: "أسبوعين" }
              ].map((phase) => (
                <div key={phase.step} className="flex gap-6 p-6 bg-white rounded-xl shadow-lg border-r-4 border-blue-500">
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2"><h4 className="text-xl font-semibold text-slate-900">{phase.title}</h4><Badge variant="secondary">{phase.duration}</Badge></div>
                    <p className="text-slate-600">{phase.desc}</p>
                  </div>
                  <div className="flex-shrink-0"><div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">{phase.step}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-slate-900">الدعم والخدمات</h3>
            <div className="space-y-6">
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center justify-end gap-4 mb-4"><h4 className="text-xl font-bold text-slate-900">دعم فني 24/7</h4><Headphones className="h-8 w-8 text-green-600" /></div>
                <ul className="space-y-2 text-slate-700 list-disc list-inside">
                  <li>دعم مباشر عبر الهاتف والواتساب (بالدارجة والفرنسية)</li>
                  <li>حل المشاكل في وقت مضمون</li>
                  <li>فريق مخصص للأندية</li>
                </ul>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center justify-end gap-4 mb-4"><h4 className="text-xl font-bold text-slate-900">تكوين مستمر</h4><School className="h-8 w-8 text-blue-600" /></div>
                <ul className="space-y-2 text-slate-700 list-disc list-inside">
                  <li>جلسات تكوين منتظمة</li>
                  <li>وثائق كاملة ودروس فيديو</li>
                  <li>ندوات شهرية حول الميزات الجديدة</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )
    },

    // Slide 8: Call to Action (Restored)
    {
      id: 'cta',
      title: 'واجد باش تحدث ثورة في ناديك؟',
      subtitle: 'انضم لنخبة الأندية لي قررت ما تخليش الفوز للصدفة.',
      content: (
        <div className="text-center space-y-12">
          <div className="space-y-8">
             <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-12 text-white shadow-2xl">
              <h3 className="text-4xl font-bold mb-6">اطلب عرضك التجريبي المخصص الآن</h3>
              <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">شوف بعينيك كيفاش فوتبول أناليتيكس برو يقدر يتأقلم مع واقع النادي ديالك. باطل وبلا التزام.</p>
              <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 text-xl px-12 py-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 font-bold">
                <span className="ml-3">أريد عرضي التجريبي المجاني</span><Calendar className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8 text-right">
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">اتصال مباشر - الجزائر</h4>
              <div className="space-y-3 text-lg">
                <p className="text-slate-700 flex justify-end items-center gap-2"><span>+213 (0)X XX XX XX XX</span><strong>:WhatsApp/الهاتف</strong></p>
                <p className="text-slate-700 flex justify-end items-center gap-2"><span>contact.dz@footballanalytics.pro</span><strong>:الإيميل</strong></p>
                <p className="text-slate-700 flex justify-end items-center gap-2"><span>7أيام/7 للأندية الشريكة</span><strong>:متوفر</strong></p>
              </div>
            </Card>
            <Card className="p-8 bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl">
              <h4 className="text-2xl font-bold text-slate-900 mb-4">الخطوات القادمة</h4>
              <div className="space-y-3 text-lg">
                <p className="text-slate-700 flex items-start justify-end gap-2"><span>عرض تجريبي مخصص (30 دقيقة)</span><ArrowLeft className="text-green-500 mt-1 h-5 w-5"/></p>
                <p className="text-slate-700 flex items-start justify-end gap-2"><span>عرض سعر على حساب النادي ديالك</span><ArrowLeft className="text-green-500 mt-1 h-5 w-5"/></p>
                <p className="text-slate-700 flex items-start justify-end gap-2"><span>فترة تجريبية للطاقم الفني ديالك</span><ArrowLeft className="text-green-500 mt-1 h-5 w-5"/></p>
              </div>
            </Card>
          </div>
        </div>
      )
    },
  ];

  // Corrected RTL navigation: Next moves left, Prev moves right
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index: number) => setCurrentSlide(index);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-50" dir="rtl">
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <span className="text-sm text-slate-600">{currentSlide + 1} / {slides.length}</span>
        </div>
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
          <span className="font-bold text-slate-900">FootballAnalytics Pro</span>
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center"><Trophy className="h-5 w-5 text-white" /></div>
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
          {/* RTL Correction: Right arrow for "previous" (visually moves right), Left arrow for "next" (visually moves left) */}
          <Button variant="outline" size="sm" onClick={prevSlide} disabled={currentSlide === 0} className="rounded-full"><ChevronRight className="h-4 w-4" /></Button>
          <div className="flex flex-row-reverse gap-2">
            {slides.map((slide, index) => <button key={slide.id} onClick={() => goToSlide(index)} aria-label={`Go to slide ${index + 1}`} className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentSlide ? 'bg-green-600 scale-125' : 'bg-slate-300 hover:bg-slate-400'}`} />)}
          </div>
          <Button variant="outline" size="sm" onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default BusinessPresentation;