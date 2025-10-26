import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

// Sample movie data - replace with API data later
const featuredMovie = {
  id: 1,
  title: 'The Last Kingdom',
  backdrop: 'https://image.tmdb.org/t/p/original/wiE9doxiLwq3WCGamDIOb2PqBqc.jpg',
  logo: null,
  description: 'A warrior destined to unite the kingdoms of England must navigate deadly political intrigue and fierce battles.',
  rating: '8.5',
  year: '2024',
  genres: ['Action', 'Drama', 'History'],
};

const movieCategories = [
  {
    id: '1',
    title: 'Trending Now',
    movies: [
      { id: 1, poster: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', title: 'Avengers: Endgame' },
      { id: 2, poster: 'https://image.tmdb.org/t/p/w500/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg', title: 'The Dark Knight' },
      { id: 3, poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', title: 'Shawshank Redemption' },
      { id: 4, poster: 'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', title: 'Lord of the Rings' },
      { id: 5, poster: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', title: 'Joker' },
      { id: 6, poster: 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', title: 'Spider-Man' },
    ],
  },
  {
    id: '2',
    title: 'Popular on OnviTV',
    movies: [
      { id: 7, poster: 'https://image.tmdb.org/t/p/w500/xBHYBT1RPkZjzxhNvXqvWnhZDRj.jpg', title: 'Inception' },
      { id: 8, poster: 'https://image.tmdb.org/t/p/w500/5hNcsnMkwU2LknLoru73c76el3z.jpg', title: 'Interstellar' },
      { id: 9, poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', title: 'The Matrix' },
      { id: 10, poster: 'https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg', title: 'Pulp Fiction' },
      { id: 11, poster: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', title: 'Fight Club' },
      { id: 12, poster: 'https://image.tmdb.org/t/p/w500/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg', title: 'Harry Potter' },
    ],
  },
  {
    id: '3',
    title: 'New Releases',
    movies: [
      { id: 13, poster: 'https://image.tmdb.org/t/p/w500/c6H7Z4u73ir3cIoCteuhJh7UCAR.jpg', title: 'Dune' },
      { id: 14, poster: 'https://image.tmdb.org/t/p/w500/bXMVveUfRIT0jwTjy0MBnImTjiX.jpg', title: 'Oppenheimer' },
      { id: 15, poster: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', title: 'Black Panther' },
      { id: 16, poster: 'https://image.tmdb.org/t/p/w500/aWeKITRFbbwY8txG5uCj4rMCfSP.jpg', title: 'Avatar' },
      { id: 17, poster: 'https://image.tmdb.org/t/p/w500/tVxDe01Zy3kZqaZRNiXFGDICdZk.jpg', title: 'Gladiator' },
      { id: 18, poster: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg', title: 'Parasite' },
    ],
  },
  {
    id: '4',
    title: 'Action & Adventure',
    movies: [
      { id: 19, poster: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', title: 'Star Wars' },
      { id: 20, poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', title: 'Forrest Gump' },
      { id: 21, poster: 'https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg', title: 'The Lion King' },
      { id: 22, poster: 'https://image.tmdb.org/t/p/w500/ym1dxyOk4jFcSl4Q2zmRrA5BEEN.jpg', title: 'The Prestige' },
      { id: 23, poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', title: 'The Godfather' },
      { id: 24, poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', title: 'Parasite' },
    ],
  },
];

const HomeScreen = ({ navigation }) => {
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = (event) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const headerOpacity = Math.min(scrollY / 300, 1);

  const renderMovieItem = ({ item }) => (
    <TouchableOpacity style={styles.movieCard} activeOpacity={0.8}>
      <Image source={{ uri: item.poster }} style={styles.moviePoster} />
    </TouchableOpacity>
  );

  const renderCategory = ({ item }) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{item.title}</Text>
      <FlatList
        data={item.movies}
        renderItem={renderMovieItem}
        keyExtractor={(movie) => movie.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.movieList}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: `rgba(15, 23, 42, ${headerOpacity})` }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Text style={styles.iconText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Featured Content */}
        <View style={styles.featuredContainer}>
          <Image
            source={{ uri: featuredMovie.backdrop }}
            style={styles.featuredImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(15, 23, 42, 0.7)', colors.neutral.slate900]}
            style={styles.featuredGradient}
          />
          
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTitle}>{featuredMovie.title}</Text>
            <View style={styles.featuredMeta}>
              <Text style={styles.metaText}>{featuredMovie.rating} ★</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{featuredMovie.year}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{featuredMovie.genres.join(', ')}</Text>
            </View>
            <Text style={styles.featuredDescription} numberOfLines={3}>
              {featuredMovie.description}
            </Text>
            
            <View style={styles.featuredButtons}>
              <TouchableOpacity style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
                <Text style={styles.playText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoButton}>
                <Text style={styles.infoIcon}>ⓘ</Text>
                <Text style={styles.infoText}>More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Movie Categories */}
        <View style={styles.categoriesContainer}>
          {movieCategories.map((category) => (
            <View key={category.id} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <FlatList
                data={category.movies}
                renderItem={renderMovieItem}
                keyExtractor={(movie) => movie.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.movieList}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.slate900,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 100,
  },
  logo: {
    width: 100,
    height: 35,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  featuredContainer: {
    height: height * 0.75,
    position: 'relative',
  },
  featuredImage: {
    width: width,
    height: '100%',
    resizeMode: 'cover',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  featuredTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 14,
    color: colors.text.secondary,
    marginHorizontal: 6,
  },
  featuredDescription: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.text.primary,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playIcon: {
    fontSize: 16,
    color: colors.neutral.slate900,
  },
  playText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.slate900,
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 18,
    color: colors.text.primary,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  categoriesContainer: {
    paddingBottom: 40,
  },
  categoryContainer: {
    marginTop: 24,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  movieList: {
    paddingHorizontal: 12,
  },
  movieCard: {
    marginHorizontal: 4,
  },
  moviePoster: {
    width: 120,
    height: 180,
    borderRadius: 4,
    backgroundColor: colors.neutral.slate800,
  },
});

export default HomeScreen;
